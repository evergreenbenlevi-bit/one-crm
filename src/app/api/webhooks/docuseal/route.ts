import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { downloadSignedPDF } from "@/lib/docuseal";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function verifyRequest(request: NextRequest, body: string): boolean {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (!secret) return false;

  // DocuSeal CE sends custom headers (not HMAC) — check x-crm-token
  const crmToken = request.headers.get("x-crm-token");
  if (crmToken) {
    try {
      return crypto.timingSafeEqual(Buffer.from(crmToken), Buffer.from(secret));
    } catch {
      return false;
    }
  }

  // Fallback: HMAC-SHA256 via x-docuseal-signature (DocuSeal Pro / custom)
  const signature = request.headers.get("x-docuseal-signature");
  if (signature) {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected),
      );
    } catch {
      return false;
    }
  }

  return false;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyRequest(request, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event_type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Use service role key — webhook has no user session, anon key blocked by RLS
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  // DocuSeal payload: data IS the submitter object (for form.completed)
  // or submission object (for submission.completed).
  // In both cases: data.submission.id = submission id, data.metadata.proposal_id = our id.
  const eventData = event.data as Record<string, unknown>;
  const submissionId = String(
    (eventData?.submission as { id?: number } | undefined)?.id ??
    (eventData?.submission_id as number | undefined) ??
    "",
  );
  const proposalId = (
    (eventData?.metadata as Record<string, unknown> | undefined)
      ?.proposal_id as string | undefined
  );

  if (!proposalId || !submissionId) {
    return NextResponse.json({ ok: true }); // ignore unrelated events
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;
  const ua = request.headers.get("user-agent") ?? undefined;

  switch (event.event_type) {
    case "submission.viewed":
    case "form.viewed": {
      await supabase
        .from("proposals")
        .update({ status: "viewed" })
        .eq("id", proposalId);
      await supabase.from("esign_audit_log").insert({
        proposal_id: proposalId,
        event_type: "viewed",
        ip_address: ip,
        user_agent: ua,
        metadata: { submission_id: submissionId },
      });
      break;
    }

    case "submission.completed":
    case "form.completed": {
      let signedPdfUrl: string | undefined;
      let documentHash: string | undefined;

      try {
        const pdfBuffer = await downloadSignedPDF(submissionId);
        documentHash = crypto
          .createHash("sha256")
          .update(pdfBuffer)
          .digest("hex");

        // Upload to Supabase Storage
        const cookieStore = await cookies();
        const serviceClient = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { cookies: { getAll: () => cookieStore.getAll() } },
        );
        const fileName = `${proposalId}/signed-${Date.now()}.pdf`;
        const { error: uploadError } = await serviceClient.storage
          .from("signed-contracts")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf" });
        if (!uploadError) {
          const { data: urlData } = serviceClient.storage
            .from("signed-contracts")
            .getPublicUrl(fileName);
          signedPdfUrl = urlData.publicUrl;
        }
      } catch {
        // non-fatal — still mark signed
      }

      await supabase
        .from("proposals")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          docuseal_submission_id: submissionId,
          signed_pdf_url: signedPdfUrl,
          document_hash: documentHash,
          signer_ip: ip,
          signer_user_agent: ua,
          otp_verified: true,
        })
        .eq("id", proposalId);

      await supabase.from("esign_audit_log").insert({
        proposal_id: proposalId,
        event_type: "signed",
        ip_address: ip,
        user_agent: ua,
        metadata: {
          submission_id: submissionId,
          document_hash: documentHash,
          signed_pdf_url: signedPdfUrl,
        },
      });

      // Auto-create customer on contract signed
      try {
        const { data: proposal } = await supabase
          .from("proposals")
          .select("lead_id, customer_id, program, amount")
          .eq("id", proposalId)
          .single();

        if (proposal?.lead_id && !proposal.customer_id) {
          const { data: lead } = await supabase
            .from("leads")
            .select("name, email, phone")
            .eq("id", proposal.lead_id)
            .single();

          if (lead?.email) {
            // Check for existing customer by email or lead_id
            const { data: existing } = await supabase
              .from("customers")
              .select("id")
              .or(`email.eq.${lead.email},lead_id.eq.${proposal.lead_id}`)
              .maybeSingle();

            if (!existing) {
              const VALID_PROGRAMS = ["one_core", "one_vip", "workshop", "digital_product"];
              const program = VALID_PROGRAMS.includes(proposal.program ?? "") ? proposal.program : null;
              await supabase.from("customers").insert({
                lead_id: proposal.lead_id,
                name: lead.name,
                email: lead.email,
                phone: lead.phone ?? null,
                program,
                status: "active",
                total_paid: proposal.amount ?? 0,
                created_at: new Date().toISOString(),
              });
              console.log(`[docuseal] Customer created for lead ${proposal.lead_id}`);
            } else {
              console.log(`[docuseal] Customer already exists for lead ${proposal.lead_id}`);
            }
          }
        }
      } catch (customerErr) {
        // Non-fatal — log but don't fail the webhook
        console.error("[docuseal] Auto-customer creation failed:", customerErr);
      }
      break;
    }

    case "submission.declined":
    case "form.declined": {
      await supabase
        .from("proposals")
        .update({ status: "rejected" })
        .eq("id", proposalId);
      await supabase.from("esign_audit_log").insert({
        proposal_id: proposalId,
        event_type: "rejected",
        ip_address: ip,
        user_agent: ua,
        metadata: { submission_id: submissionId },
      });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
