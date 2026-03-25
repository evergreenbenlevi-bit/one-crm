import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewPayment } from "@/lib/telegram";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", body.email)
    .maybeSingle();

  let customerId: string;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, total_paid, products_purchased")
    .eq("email", body.email)
    .maybeSingle();

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 4);

  if (existingCustomer) {
    customerId = existingCustomer.id;
    const products = existingCustomer.products_purchased || [];
    if (!products.includes("one_vip")) products.push("one_vip");
    await supabase.from("customers").update({
      products_purchased: products,
      total_paid: Number(existingCustomer.total_paid) + (body.amount || 8000),
      program_start_date: startDate.toISOString().split("T")[0],
      program_end_date: endDate.toISOString().split("T")[0],
      current_month: 1,
    }).eq("id", customerId);
  } else {
    const { data: newCustomer } = await supabase.from("customers").insert({
      lead_id: lead?.id || null,
      name: body.name || "",
      email: body.email || null,
      phone: body.phone || null,
      products_purchased: ["one_vip"],
      total_paid: body.amount || 8000,
      payment_status: body.installments ? "pending" : "completed",
      program_start_date: startDate.toISOString().split("T")[0],
      program_end_date: endDate.toISOString().split("T")[0],
      current_month: 1,
      status: "active",
    }).select().single();
    customerId = newCustomer!.id;
  }

  await supabase.from("transactions").insert({
    customer_id: customerId,
    lead_id: lead?.id || null,
    product: "one_vip",
    amount: body.amount || 8000,
    payment_method: "upay",
    installments_total: body.installments || 4,
    installments_paid: 1,
    status: "completed",
    external_id: body.transaction_id || null,
  });

  // Telegram notification
  notifyNewPayment(body.name || "(ללא שם)", body.amount || 8000, "one_vip");

  if (lead) {
    await supabase.from("leads").update({ current_status: "active_client" }).eq("id", lead.id);
    await supabase.from("funnel_events").insert({
      lead_id: lead.id,
      event_type: "purchased",
      metadata: { amount: body.amount, method: "upay" },
    });
  }

  return NextResponse.json({ customer_id: customerId }, { status: 201 });
}
