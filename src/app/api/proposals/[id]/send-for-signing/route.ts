import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { generateContractPdf, ContractData } from "@/lib/contract-pdf";

// CONTRACT SIGNING UNAVAILABLE
// DocuSeal removed 2026-06-01. PowerDoc integration pending (separate build).
// This route generates and stores the contract PDF but cannot send for e-signing.
// TODO: wire PowerDoc when ready (see eden-proposal-powerdoc-contract-build.md).

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

  // ── Step 4: E-signing unavailable — DocuSeal removed, PowerDoc not yet wired ──

  return NextResponse.json(
    {
      error: "contract_signing_unavailable",
      message: "E-signing is not available. DocuSeal has been removed. PowerDoc integration pending.",
      contract_pdf_url: contractPdfUrl ?? null,
    },
    { status: 503 },
  );
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
