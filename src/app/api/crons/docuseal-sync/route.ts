import { createAdminClient } from "@/lib/supabase/admin";
import { getSubmission, downloadSignedPDF } from "@/lib/docuseal";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Runs every 10 minutes — recovers proposals stuck in "sent" when Sidekiq/Redis drops the webhook job.
// Finds proposals with docuseal_submission_id + status=sent that haven't updated in >10 min,
// checks DocuSeal API, and completes them if the submission is done.

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: stuck, error } = await supabase
    .from("proposals")
    .select("id, docuseal_submission_id, lead_id, customer_id, program, amount")
    .eq("status", "sent")
    .not("docuseal_submission_id", "is", null)
    .lt("updated_at", cutoff)
    .limit(20);

  if (error) {
    console.error("[docuseal-sync] query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!stuck || stuck.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  const results: Array<{ id: string; result: string }> = [];

  for (const proposal of stuck) {
    const submissionId = proposal.docuseal_submission_id as string;
    try {
      const submission = await getSubmission(submissionId);

      if (submission.status !== "completed") {
        results.push({ id: proposal.id, result: `skip:${submission.status}` });
        continue;
      }

      // Submission is done but webhook was never processed — complete it now
      let signedPdfUrl: string | undefined;
      let documentHash: string | undefined;

      try {
        const pdfBuffer = await downloadSignedPDF(submissionId);
        documentHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

        const fileName = `${proposal.id}/signed-recovery-${Date.now()}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("signed-contracts")
          .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("signed-contracts")
            .getPublicUrl(fileName);
          signedPdfUrl = urlData.publicUrl;
        }
      } catch (pdfErr) {
        console.warn("[docuseal-sync] PDF download failed for", proposal.id, pdfErr);
      }

      await supabase
        .from("proposals")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          docuseal_submission_id: submissionId,
          signed_pdf_url: signedPdfUrl ?? null,
          document_hash: documentHash ?? null,
          otp_verified: true,
        })
        .eq("id", proposal.id);

      await supabase.from("esign_audit_log").insert({
        proposal_id: proposal.id,
        event_type: "signed",
        metadata: {
          submission_id: submissionId,
          document_hash: documentHash,
          signed_pdf_url: signedPdfUrl,
          recovered_by: "docuseal-sync-cron",
        },
      });

      // Auto-create customer if missing
      if (proposal.lead_id && !proposal.customer_id) {
        try {
          const { data: lead } = await supabase
            .from("leads")
            .select("name, email, phone")
            .eq("id", proposal.lead_id)
            .single();

          if (lead?.email) {
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
            }
          }
        } catch {
          // non-fatal
        }
      }

      results.push({ id: proposal.id, result: "signed" + (signedPdfUrl ? "+pdf" : "") });
      console.log(`[docuseal-sync] recovered proposal ${proposal.id}`);
    } catch (err) {
      console.error("[docuseal-sync] error for", proposal.id, err);
      results.push({ id: proposal.id, result: `error:${String(err)}` });
    }
  }

  return NextResponse.json({ synced: results.filter(r => r.result.startsWith("signed")).length, results });
}
