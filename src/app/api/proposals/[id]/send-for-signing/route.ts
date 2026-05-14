import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { createSubmission, updateTemplateDocument } from "@/lib/docuseal";
import { generateContractPdf, ContractData } from "@/lib/contract-pdf";
import nodemailer from "nodemailer";
import { ambassadorContractEmail } from "@/lib/email-templates/ambassador-contract";

const SENDER_EMAIL = "ben.evyatar.one@gmail.com";
const SENDER_NAME = "Ben Levi";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch proposal with lead/customer for all contract fields
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select(
      "*, leads(name, email, phone), customers(name, email, phone)",
    )
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

  // Validate required fields before creating DocuSeal submission
  const missingFields: string[] = [];
  if (!contact?.name) missingFields.push("client_name");
  if (!contact?.email) missingFields.push("client_email");
  if (!contact?.phone) missingFields.push("client_phone");
  if (!proposal.amount) missingFields.push("amount");
  if (!proposal.program) missingFields.push("program");
  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: "missing_fields", fields: missingFields },
      { status: 400 },
    );
  }

  if (!contact?.email)
    return NextResponse.json(
      { error: "No email on lead/customer" },
      { status: 400 },
    );

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;

  // ── Step 1: Build contract data ──────────────────────────────────────────

  // Format start date
  const startDate = proposal.start_date
    ? new Date(proposal.start_date as string).toLocaleDateString("he-IL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("he-IL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  // Format price
  const priceNum = Number(proposal.amount ?? 0);
  const priceFormatted = `₪${priceNum.toLocaleString("he-IL")}`;

  // Payment terms — use proposal field or derive from program
  const paymentTerms: string =
    (proposal.payment_terms as string | null) ??
    derivePaymentTerms(proposal.program as string | null, priceNum);

  const paymentPlan: string =
    (proposal.payment_plan as string | null) ??
    derivePlan(proposal.payment_structure as string | null);

  const contractData: ContractData = {
    clientName: contact.name ?? "לקוח",
    clientIdNumber: (proposal.client_id_number as string | null) ?? "_______________",
    clientAddress:
      (proposal.client_address as string | null) ??
      (contact as { address?: string | null })?.address ??
      "_______________",
    clientPhone: contact.phone ?? "_______________",
    clientEmail: contact.email ?? "_______________",
    startDate,
    price: priceFormatted,
    paymentTerms,
    paymentPlan,
    specialNotes: (proposal.special_notes as string | null) ?? undefined,
  };

  // ── Step 2: Generate PDF ─────────────────────────────────────────────────

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await generateContractPdf(contractData);
  } catch (pdfErr) {
    console.error("[send-for-signing] PDF generation failed:", pdfErr);
    return NextResponse.json(
      { error: "PDF generation failed", details: String(pdfErr) },
      { status: 500 },
    );
  }

  // ── Step 3: Upload PDF to Supabase Storage ───────────────────────────────

  const pdfPath = `contracts/contract-${id}-${Date.now()}.pdf`;
  let contractPdfUrl: string | undefined;

  try {
    const { error: uploadErr } = await supabase.storage
      .from("signed-contracts")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) {
      console.warn("[send-for-signing] Storage upload failed:", uploadErr.message);
      // Non-fatal — continue without storing URL
    } else {
      const { data: urlData } = supabase.storage
        .from("signed-contracts")
        .getPublicUrl(pdfPath);
      contractPdfUrl = urlData.publicUrl;
    }
  } catch (storageErr) {
    console.warn("[send-for-signing] Storage error:", storageErr);
    // Non-fatal — continue
  }

  // ── Step 4: Update DocuSeal template with new PDF ────────────────────────

  try {
    await updateTemplateDocument(pdfBuffer, id);
  } catch (tmplErr) {
    console.error("[send-for-signing] DocuSeal template update failed:", tmplErr);
    return NextResponse.json(
      { error: "DocuSeal template update failed", details: String(tmplErr) },
      { status: 500 },
    );
  }

  // ── Step 5: Create DocuSeal submission ───────────────────────────────────

  const { submissionId, signingUrl } = await createSubmission(
    id,
    contact.email,
    contact.name ?? "לקוח",
  );

  // ── Step 6: Persist state ────────────────────────────────────────────────

  await supabase
    .from("proposals")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      docuseal_submission_id: submissionId,
      docuseal_document_url: signingUrl.trim(),
      contract_pdf_url: contractPdfUrl ?? null,
    })
    .eq("id", id);

  await supabase.from("esign_audit_log").insert({
    proposal_id: id,
    event_type: "sent",
    ip_address: ip,
    metadata: {
      submission_id: submissionId,
      signing_url: signingUrl.trim(),
      contract_pdf_url: contractPdfUrl,
      dynamic_pdf: true,
    },
  });

  // ── Step 7: Send email with signing link ─────────────────────────────────

  if (process.env.GMAIL_APP_PASSWORD) {
    try {
      const { subject, html } = ambassadorContractEmail(
        signingUrl,
        contact.name ?? "לקוח",
      );
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
    console.warn(
      "[send-for-signing] GMAIL_APP_PASSWORD not set — signing email not sent",
    );
  }

  return NextResponse.json({
    signing_url: signingUrl.trim(),
    submission_id: submissionId,
    contract_pdf_url: contractPdfUrl,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function derivePaymentTerms(program: string | null, total: number): string {
  if (!program) return `סה"כ ₪${total.toLocaleString("he-IL")}`;

  // Standard program naming: standard_6m, standard_3m, premium_6m
  if (program.includes("premium")) {
    // 4 installments
    const perPayment = Math.round(total / 4).toLocaleString("he-IL");
    return `4 תשלומים × ₪${perPayment}`;
  }
  if (program.includes("3m")) {
    // Single payment or 3 installments
    return `3 תשלומים × ₪${Math.round(total / 3).toLocaleString("he-IL")}`;
  }
  // Default: 4 installments
  const perPayment = Math.round(total / 4).toLocaleString("he-IL");
  return `4 תשלומים × ₪${perPayment}`;
}

function derivePlan(paymentStructure: string | null): string {
  if (!paymentStructure) return "מסלול A";
  if (paymentStructure.includes("אחד") || paymentStructure.includes("חד-פעמי")) {
    return "מסלול C — תשלום חד-פעמי";
  }
  if (paymentStructure.includes("7")) return "מסלול B — תשלומים מורחב";
  return "מסלול A — תשלומים";
}
