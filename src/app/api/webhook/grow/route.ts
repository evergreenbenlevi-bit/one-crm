import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GROW webhook formats:
// A. Legacy/API format — flat JSON with paymentSum, transactionCode, allPaymentNum
// B. PaymentLinks (new) — wrapped in { err, status, data: { sum, transactionId, allPaymentsNum, productData[], ... } }
// C. Failed recurring — snake_case fields (regular_payment_id, error_message)
// D. Invoice — { transactionCode, invoiceNumber, invoiceUrl }
// Docs: https://grow-il.readme.io/docs/overview-7

// ── Normalized payment data after parsing any format ──
interface NormalizedPayment {
  webhookKey: string;
  transactionCode: string;
  transactionType: string;
  amount: number;
  paymentsNum: number;
  allPaymentNum: number;
  firstPaymentSum: number;
  periodicalPaymentSum: number;
  paymentType: string;
  paymentDate: string;
  asmachta: string;
  description: string;
  fullName: string;
  phone: string;
  email: string;
  cardSuffix: string;
  cardBrand: string;
  cardType: string;
  paymentSource: string;
  // Extended fields
  directDebitId: string;
  purchasePageKey: string;
  purchasePageTitle: string;
  transactionToken: string;
  processId: string;
  processToken: string;
  cardExp: string;
  invoiceName: string;
  address: string;
  // Complex fields
  productData: Array<{ name: string; quantity: string; price: string; catalog_number: string; vat: string }>;
  shipping: { type: string; amount: string } | null;
  dynamicFields: Array<{ label: string; field_value: string }>;
  customFields: Record<string, string>;
  isPaymentLink: boolean;
  isRecurring: boolean;
  rawPayload: Record<string, unknown>;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function num(val: unknown): number {
  const n = parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
}

// ── Normalize any GROW webhook format into a single shape ──
function normalizePayload(raw: Record<string, unknown>): NormalizedPayment {
  // Detect PaymentLinks format: has { data: { ... } } wrapper
  const isPaymentLink = typeof raw.data === "object" && raw.data !== null && !Array.isArray(raw.data);
  const d = isPaymentLink ? (raw.data as Record<string, unknown>) : raw;

  const paymentType = str(d.paymentType);
  const directDebitId = str(d.directDebitId);
  const isRecurring = paymentType === "הוראת קבע" || paymentType.includes("קבע") || !!directDebitId;

  return {
    webhookKey: str(d.webhookKey || raw.webhookKey || raw.webhook_key),
    transactionCode: str(d.transactionCode || d.transactionId),
    transactionType: str(d.transactionType || d.transactionTypeId),
    amount: num(d.paymentSum || d.sum),
    paymentsNum: num(d.paymentsNum),
    allPaymentNum: num(d.allPaymentNum || d.allPaymentsNum),
    firstPaymentSum: num(d.firstPaymentSum),
    periodicalPaymentSum: num(d.periodicalPaymentSum),
    paymentType: str(d.paymentType),
    paymentDate: str(d.paymentDate),
    asmachta: str(d.asmachta),
    description: str(d.paymentDesc || d.description),
    fullName: str(d.fullName),
    phone: str(d.payerPhone),
    email: str(d.payerEmail),
    cardSuffix: str(d.cardSuffix),
    cardBrand: str(d.cardBrand),
    cardType: str(d.cardType),
    paymentSource: str(d.paymentSource),
    directDebitId,
    purchasePageKey: str(d.purchasePageKey),
    purchasePageTitle: str(d.purchasePageTitle),
    transactionToken: str(d.transactionToken),
    processId: str(d.processId || d.paymentLinkProcessId),
    processToken: str(d.processToken || d.paymentLinkProcessToken),
    cardExp: str(d.cardExp),
    invoiceName: str(d.invoice_name),
    address: str(d.address),
    productData: Array.isArray(d.productData) ? d.productData as NormalizedPayment["productData"] : [],
    shipping: (typeof d.shipping === "object" && d.shipping !== null) ? d.shipping as NormalizedPayment["shipping"] : null,
    dynamicFields: Array.isArray(d.dynamicFields) ? d.dynamicFields as NormalizedPayment["dynamicFields"] : [],
    customFields: (typeof d.purchaseCustomField === "object" && d.purchaseCustomField !== null)
      ? d.purchaseCustomField as Record<string, string> : {},
    isPaymentLink,
    isRecurring,
    rawPayload: raw,
  };
}

export async function POST(request: NextRequest) {
  let raw: Record<string, unknown>;

  // GROW sends JSON
  try {
    raw = await request.json();
  } catch {
    try {
      const formData = await request.formData();
      raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
  }

  // Quick webhook key check (before normalization — key can be at top level)
  const webhookKey = str(raw.webhookKey || raw.webhook_key || (typeof raw.data === "object" && raw.data ? (raw.data as Record<string, unknown>).webhookKey : ""));
  const expectedKey = process.env.GROW_WEBHOOK_KEY;
  if (expectedKey && webhookKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // ── Invoice webhook ──
  if (raw.invoiceNumber && raw.invoiceUrl && !raw.paymentSum && !raw.data) {
    if (raw.transactionCode) {
      await supabase.from("transactions")
        .update({ invoice_number: str(raw.invoiceNumber), invoice_url: str(raw.invoiceUrl) })
        .eq("external_id", str(raw.transactionCode));
    }
    return NextResponse.json({ ok: true, type: "invoice" }, { status: 200 });
  }

  // ── Failed Recurring Payment ──
  if (raw.error_message || raw.regular_payment_id) {
    await supabase.from("funnel_events").insert({
      event_type: "payment_failed",
      metadata: {
        regular_payment_id: str(raw.regular_payment_id),
        error_message: str(raw.error_message),
        charges_attempts: str(raw.charges_attempts),
        name: str(raw.payer_name || raw.fullName),
        email: str(raw.email || raw.payerEmail),
        phone: str(raw.phone || raw.payerPhone),
        sum: str(raw.sum),
      },
    });
    return NextResponse.json({ ok: true, type: "failed_recurring" }, { status: 200 });
  }

  // ── Regular / Recurring / PaymentLink Payment ──
  const p = normalizePayload(raw);

  if (!p.email && !p.phone) {
    return NextResponse.json({ error: "Missing payer info" }, { status: 400 });
  }

  // Find lead
  let lead = null;
  if (p.email) {
    const { data } = await supabase.from("leads").select("id").eq("email", p.email).maybeSingle();
    lead = data;
  }
  if (!lead && p.phone) {
    const { data } = await supabase.from("leads").select("id").eq("phone", p.phone).maybeSingle();
    lead = data;
  }

  // Determine product
  const product = p.amount > 1000 ? "one_vip" : "one_core";

  // Find or create customer
  let customerId: string;
  const customerQuery = p.email
    ? supabase.from("customers").select("id, total_paid, products_purchased").eq("email", p.email).maybeSingle()
    : supabase.from("customers").select("id, total_paid, products_purchased").eq("phone", p.phone).maybeSingle();

  const { data: existingCustomer } = await customerQuery;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    const products: string[] = existingCustomer.products_purchased || [];
    if (!products.includes(product)) products.push(product);
    await supabase.from("customers").update({
      products_purchased: products,
      total_paid: Number(existingCustomer.total_paid) + p.amount,
      ...(p.address ? { address: p.address } : {}),
      ...(product === "one_vip" ? {
        current_month: 1,
        program_start_date: new Date().toISOString().split("T")[0],
      } : {}),
    }).eq("id", customerId);
  } else {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 4);

    const { data: newCustomer } = await supabase.from("customers").insert({
      lead_id: lead?.id || null,
      name: p.fullName || p.invoiceName,
      email: p.email || null,
      phone: p.phone || null,
      products_purchased: [product],
      total_paid: p.amount,
      payment_status: p.paymentsNum < p.allPaymentNum ? "pending" : "completed",
      status: "active",
      ...(p.address ? { address: p.address } : {}),
      ...(product === "one_vip" ? {
        current_month: 1,
        program_start_date: new Date().toISOString().split("T")[0],
        program_end_date: endDate.toISOString().split("T")[0],
      } : {}),
    }).select().single();
    customerId = newCustomer!.id;
  }

  // Log transaction with full metadata
  await supabase.from("transactions").insert({
    customer_id: customerId,
    lead_id: lead?.id || null,
    product,
    amount: p.amount,
    payment_method: "grow",
    installments_total: p.allPaymentNum,
    installments_paid: p.paymentsNum,
    status: "completed",
    external_id: p.transactionCode || null,
    metadata: {
      // Card
      cardSuffix: p.cardSuffix,
      cardBrand: p.cardBrand,
      cardType: p.cardType,
      cardExp: p.cardExp,
      asmachta: p.asmachta,
      // Payment info
      paymentType: p.paymentType,
      paymentDate: p.paymentDate,
      paymentSource: p.paymentSource,
      description: p.description,
      firstPaymentSum: p.firstPaymentSum,
      periodicalPaymentSum: p.periodicalPaymentSum,
      // Identifiers
      directDebitId: p.directDebitId,
      transactionToken: p.transactionToken,
      processId: p.processId,
      processToken: p.processToken,
      // Page info
      purchasePageKey: p.purchasePageKey,
      purchasePageTitle: p.purchasePageTitle,
      invoiceName: p.invoiceName,
      address: p.address,
      // Products & extras (PaymentLinks only)
      ...(p.productData.length > 0 ? { products: p.productData } : {}),
      ...(p.shipping ? { shipping: p.shipping } : {}),
      ...(p.dynamicFields.length > 0 ? { dynamicFields: p.dynamicFields } : {}),
      ...(Object.keys(p.customFields).length > 0 ? { customFields: p.customFields } : {}),
      // Flags
      isPaymentLink: p.isPaymentLink,
      isRecurring: p.isRecurring,
    },
  });

  // Update lead status
  if (lead) {
    await supabase.from("leads").update({ current_status: "active_client" }).eq("id", lead.id);
    await supabase.from("funnel_events").insert({
      lead_id: lead.id,
      event_type: "purchased",
      metadata: {
        amount: p.amount,
        method: "grow",
        transaction: p.transactionCode,
        installment: `${p.paymentsNum}/${p.allPaymentNum}`,
        paymentType: p.paymentType,
        isRecurring: p.isRecurring,
        isPaymentLink: p.isPaymentLink,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    type: p.isPaymentLink ? "payment_link" : p.isRecurring ? "recurring" : "payment",
    customer_id: customerId,
  }, { status: 200 });
}
