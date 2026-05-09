import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { createSubmission } from "@/lib/docuseal";
import nodemailer from "nodemailer";
import { ambassadorContractEmail } from "@/lib/email-templates/ambassador-contract";

const SENDER_EMAIL = "evergreen.benlevi@gmail.com";
const SENDER_NAME = "Ben Levi";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch proposal with lead/customer for email
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("*, leads(name, email), customers(name, email)")
    .eq("id", id)
    .single();

  if (error || !proposal)
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  if (!["draft", "sent"].includes(proposal.status)) {
    return NextResponse.json(
      { error: `Cannot send proposal with status: ${proposal.status}` },
      { status: 400 },
    );
  }

  const contact = proposal.leads ?? proposal.customers;
  if (!contact?.email)
    return NextResponse.json(
      { error: "No email on lead/customer" },
      { status: 400 },
    );

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;

  const { submissionId, signingUrl } = await createSubmission(
    id,
    contact.email,
    contact.name ?? "לקוח",
  );

  await supabase
    .from("proposals")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      docuseal_submission_id: submissionId,
      docuseal_document_url: signingUrl,
    })
    .eq("id", id);

  await supabase.from("esign_audit_log").insert({
    proposal_id: id,
    event_type: "sent",
    ip_address: ip,
    metadata: { submission_id: submissionId, signing_url: signingUrl },
  });

  // Send HTML email with signing link
  if (process.env.GMAIL_APP_PASSWORD) {
    try {
      const { subject, html } = ambassadorContractEmail(signingUrl, contact.name ?? "לקוח");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: SENDER_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
        to: contact.email,
        subject,
        html,
      });
    } catch (emailErr) {
      // Non-fatal — log but don't fail the response
      console.error("[send-for-signing] Email send failed:", emailErr);
    }
  } else {
    // TODO: set GMAIL_APP_PASSWORD env var to enable signing email delivery
    console.warn("[send-for-signing] GMAIL_APP_PASSWORD not set — signing email not sent");
  }

  return NextResponse.json({ signing_url: signingUrl, submission_id: submissionId });
}
