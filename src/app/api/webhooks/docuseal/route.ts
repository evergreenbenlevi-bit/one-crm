import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { downloadSignedPDF } from "@/lib/docuseal";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-docuseal-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event_type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const submissionId = String(
    (event.data?.submission as { id?: number })?.id ?? "",
  );
  const submitter = event.data?.submitter as Record<string, unknown> | undefined;
  const proposalId = (
    (submitter?.metadata as Record<string, unknown> | undefined)
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
