import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// GROW webhook types:
// 1. Regular payment (one-time / installments)
// 2. Recurring payment (2nd charge onward)
// 3. Failed recurring payment
// 4. Invoice creation
// Docs: https://grow-il.readme.io/docs/overview-7

interface GrowPayload {
  webhookKey?: string;
  transactionCode?: string;
  transactionType?: string;  // "אשראי"
  paymentSum?: number;
  paymentsNum?: number;       // current installment number
  allPaymentNum?: number;     // total installments
  firstPaymentSum?: number;
  periodicalPaymentSum?: number;
  paymentType?: string;       // "רגיל" | "תשלומים" | "הוראת קבע"
  paymentDate?: string;
  asmachta?: string;
  paymentDesc?: string;
  fullName?: string;
  payerPhone?: string;
  payerEmail?: string;
  cardSuffix?: string;
  cardBrand?: string;         // "Visa" | "Mastercard"
  cardType?: string;          // "Local"
  paymentSource?: string;     // "מערכת חיצונית" | "אתר עסקי" | "ריצת הוראת קבע"
  directDebitId?: string;
  // Invoice-only fields
  invoiceNumber?: string;
  invoiceUrl?: string;
  // Failed recurring fields
  regular_payment_id?: string;
  payer_name?: string;
  phone?: string;
  email?: string;
  error_message?: string;
  charges_attempts?: string;
  webhook_key?: string;
  sum?: string;
}

export async function POST(request: NextRequest) {
  let payload: GrowPayload;

  // GROW sends JSON
  try {
    payload = await request.json();
  } catch {
    // Fallback: try FormData (legacy support)
    try {
      const formData = await request.formData();
      payload = Object.fromEntries(formData.entries()) as unknown as GrowPayload;
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
  }

  // Verify webhook key
  const webhookKey = payload.webhookKey || payload.webhook_key;
  const expectedKey = process.env.GROW_WEBHOOK_KEY;
  if (expectedKey && webhookKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // ── Handle Invoice webhook (no payment data) ──
  if (payload.invoiceNumber && payload.invoiceUrl && !payload.paymentSum) {
    // Log invoice creation — link to existing transaction
    if (payload.transactionCode) {
      await supabase.from("transactions")
        .update({
          invoice_number: payload.invoiceNumber,
          invoice_url: payload.invoiceUrl,
        })
        .eq("external_id", payload.transactionCode);
    }
    return NextResponse.json({ ok: true, type: "invoice" }, { status: 200 });
  }

  // ── Handle Failed Recurring Payment ──
  if (payload.error_message || payload.regular_payment_id) {
    const name = payload.payer_name || payload.fullName || "";
    const email = payload.email || payload.payerEmail || "";
    const phone = payload.phone || payload.payerPhone || "";

    // Log failed payment event
    await supabase.from("funnel_events").insert({
      event_type: "payment_failed",
      metadata: {
        regular_payment_id: payload.regular_payment_id,
        error_message: payload.error_message,
        charges_attempts: payload.charges_attempts,
        name,
        email,
        phone,
        sum: payload.sum,
      },
    });

    return NextResponse.json({ ok: true, type: "failed_recurring" }, { status: 200 });
  }

  // ── Handle Regular / Recurring Payment ──
  const email = payload.payerEmail || "";
  const name = payload.fullName || "";
  const phone = payload.payerPhone || "";
  const amount = typeof payload.paymentSum === "number" ? payload.paymentSum : parseFloat(String(payload.paymentSum)) || 0;
  const transactionCode = payload.transactionCode || "";
  const paymentsNum = Number(payload.paymentsNum) || 1;
  const allPaymentNum = Number(payload.allPaymentNum) || 1;

  if (!email && !phone) {
    return NextResponse.json({ error: "Missing payer info" }, { status: 400 });
  }

  // Find lead by email or phone
  let lead = null;
  if (email) {
    const { data } = await supabase.from("leads").select("id").eq("email", email).maybeSingle();
    lead = data;
  }
  if (!lead && phone) {
    const { data } = await supabase.from("leads").select("id").eq("phone", phone).maybeSingle();
    lead = data;
  }

  // Determine product from amount
  const product = amount > 1000 ? "one_vip" : "one_core";

  // Find or create customer
  let customerId: string;
  const query = email
    ? supabase.from("customers").select("id, total_paid, products_purchased").eq("email", email).maybeSingle()
    : supabase.from("customers").select("id, total_paid, products_purchased").eq("phone", phone).maybeSingle();

  const { data: existingCustomer } = await query;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    const products: string[] = existingCustomer.products_purchased || [];
    if (!products.includes(product)) products.push(product);
    await supabase.from("customers").update({
      products_purchased: products,
      total_paid: Number(existingCustomer.total_paid) + amount,
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
      name,
      email: email || null,
      phone: phone || null,
      products_purchased: [product],
      total_paid: amount,
      payment_status: paymentsNum < allPaymentNum ? "pending" : "completed",
      status: "active",
      ...(product === "one_vip" ? {
        current_month: 1,
        program_start_date: new Date().toISOString().split("T")[0],
        program_end_date: endDate.toISOString().split("T")[0],
      } : {}),
    }).select().single();
    customerId = newCustomer!.id;
  }

  // Determine if recurring
  const isRecurring = payload.paymentType === "הוראת קבע" || !!payload.directDebitId;

  // Log transaction with all GROW fields
  await supabase.from("transactions").insert({
    customer_id: customerId,
    lead_id: lead?.id || null,
    product,
    amount,
    payment_method: "grow",
    installments_total: allPaymentNum,
    installments_paid: paymentsNum,
    status: "completed",
    external_id: transactionCode || null,
    metadata: {
      transactionType: payload.transactionType,
      paymentType: payload.paymentType,
      paymentDate: payload.paymentDate,
      asmachta: payload.asmachta,
      cardSuffix: payload.cardSuffix,
      cardBrand: payload.cardBrand,
      cardType: payload.cardType,
      paymentSource: payload.paymentSource,
      firstPaymentSum: payload.firstPaymentSum,
      periodicalPaymentSum: payload.periodicalPaymentSum,
      directDebitId: payload.directDebitId,
      isRecurring,
    },
  });

  // Update lead status
  if (lead) {
    await supabase.from("leads").update({ current_status: "active_client" }).eq("id", lead.id);
    await supabase.from("funnel_events").insert({
      lead_id: lead.id,
      event_type: "purchased",
      metadata: {
        amount,
        method: "grow",
        transaction: transactionCode,
        installment: `${paymentsNum}/${allPaymentNum}`,
        paymentType: payload.paymentType,
        isRecurring,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    type: isRecurring ? "recurring" : "payment",
    customer_id: customerId,
  }, { status: 200 });
}
