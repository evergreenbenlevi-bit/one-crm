import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { generateContractPdf, ContractData } from "@/lib/contract-pdf";
import { sendContractForSigning, PowerDocQuotaExhaustedError } from "@/lib/powerdoc";
import { notifyContractQuotaExhausted } from "@/lib/telegram";

// CONTRACT SIGNING via PowerDoc EOT (one-time send, no template).
// Generates the contract PDF, uploads a copy to Storage, then sends it to the
// client for e-signing through PowerDoc and stores the signing URL.

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

  // Validate required fields
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

  // ── Step 1: Build contract data ──────────────────────────────────────────

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

  const priceNum = Number(proposal.amount ?? 0);
  const priceFormatted = `₪${priceNum.toLocaleString("he-IL")}`;

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
    } else {
      const { data: urlData } = supabase.storage
        .from("signed-contracts")
        .getPublicUrl(pdfPath);
      contractPdfUrl = urlData.publicUrl;
    }
  } catch (storageErr) {
    console.warn("[send-for-signing] Storage error:", storageErr);
  }

  // ── Step 4: Send for e-signing via PowerDoc EOT ──────────────────────────

  let signingUrl: string;
  let submissionId: string;
  try {
    const result = await sendContractForSigning({
      pdfBuffer,
      clientName: contractData.clientName,
      email: contact.email,
      phone: contact.phone ?? null,
      externalId: id,
      message: `הסכם EDEN שגרירים מוכן לחתימתך — ${contractData.clientName}`,
    });
    signingUrl = result.signingUrl;
    submissionId = result.submissionId;
  } catch (sendErr) {
    // Quota exhausted (PowerDoc 4097002): alert Ben loudly — the client got
    // nothing — and return 402 so the UI can show "refill credits", not a
    // generic failure. PDF was already uploaded to Storage above.
    if (sendErr instanceof PowerDocQuotaExhaustedError) {
      console.error("[send-for-signing] PowerDoc quota exhausted (4097002):", sendErr.message);
      notifyContractQuotaExhausted(contractData.clientName, id);
      return NextResponse.json(
        {
          error: "powerdoc_quota_exhausted",
          code: sendErr.code,
          message:
            "אזלו קרדיטים לשליחה ב-PowerDoc. חדש מנוי ב-app.powerdoc.co ושלח שוב.",
          contract_pdf_url: contractPdfUrl ?? null,
        },
        { status: 402 },
      );
    }
    console.error("[send-for-signing] PowerDoc EOT send failed:", sendErr);
    return NextResponse.json(
      {
        error: "contract_send_failed",
        message: String(sendErr),
        contract_pdf_url: contractPdfUrl ?? null,
      },
      { status: 502 },
    );
  }

  // ── Step 5: Persist signing URL (reuse docuseal_document_url column) ─────

  const { error: updateErr } = await supabase
    .from("proposals")
    .update({ docuseal_document_url: signingUrl })
    .eq("id", id);

  if (updateErr) {
    console.error("[send-for-signing] Failed to save signing URL:", updateErr.message);
    return NextResponse.json(
      {
        error: "signing_url_not_saved",
        message: updateErr.message,
        signing_url: signingUrl,
        contract_pdf_url: contractPdfUrl ?? null,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    signing_url: signingUrl,
    submission_id: submissionId,
    contract_pdf_url: contractPdfUrl ?? null,
    sign_page: `/sign/${id}`,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function derivePaymentTerms(program: string | null, total: number): string {
  if (!program) return `סה"כ ₪${total.toLocaleString("he-IL")}`;

  if (program.includes("premium")) {
    const perPayment = Math.round(total / 4).toLocaleString("he-IL");
    return `4 תשלומים × ₪${perPayment}`;
  }
  if (program.includes("3m")) {
    return `3 תשלומים × ₪${Math.round(total / 3).toLocaleString("he-IL")}`;
  }
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
