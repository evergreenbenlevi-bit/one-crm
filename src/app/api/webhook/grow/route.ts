import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // GROW sends FormData, not JSON
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const get = (key: string) => formData.get(key)?.toString() || "";

  // Verify webhook key if configured
  const webhookKey = get("webhookKey");
  const expectedKey = process.env.GROW_WEBHOOK_KEY;
  if (expectedKey && webhookKey !== expectedKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = get("payerEmail");
  const name = get("fullName");
  const phone = get("payerPhone");
  const amount = parseFloat(get("paymentSum")) || 0;
  const transactionCode = get("transactionCode");
  const paymentsNum = parseInt(get("paymentsNum")) || 1;
  const allPaymentNum = parseInt(get("allPaymentNum")) || 1;

  if (!email && !phone) {
    return NextResponse.json({ error: "Missing payer info" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find lead by email or phone
  let lead = null;
  if (email) {
    const { data } = await supabase.from("leads").select("id").eq("email", email).maybeSingle();
    lead = data;
  }
  if (!lead && phone) {
    const { data } = await supabase.from("leads").select("id").or(`phone.eq.${phone}`).maybeSingle();
    lead = data;
  }

  // Determine product from amount (one_vip = above 1000, one_core = below)
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

  // Log transaction
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
  });

  // Update lead status
  if (lead) {
    await supabase.from("leads").update({ current_status: "active_client" }).eq("id", lead.id);
    await supabase.from("funnel_events").insert({
      lead_id: lead.id,
      event_type: "purchased",
      metadata: { amount, method: "grow", transaction: transactionCode, installment: `${paymentsNum}/${allPaymentNum}` },
    });
  }

  return NextResponse.json({ ok: true, customer_id: customerId }, { status: 200 });
}
