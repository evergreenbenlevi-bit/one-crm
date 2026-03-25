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

  // Find lead by email
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("email", body.email)
    .maybeSingle();

  // Create or find customer
  let customerId: string;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("email", body.email)
    .maybeSingle();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    await supabase.from("customers").update({
      products_purchased: body.products_purchased || ["one_core"],
      total_paid: body.amount,
    }).eq("id", customerId);
  } else {
    const { data: newCustomer } = await supabase.from("customers").insert({
      lead_id: lead?.id || null,
      name: body.name || "",
      email: body.email || null,
      phone: body.phone || null,
      products_purchased: ["one_core"],
      total_paid: body.amount || 165,
      payment_status: "completed",
      status: "active",
    }).select().single();
    customerId = newCustomer!.id;
  }

  // Create transaction
  await supabase.from("transactions").insert({
    customer_id: customerId,
    lead_id: lead?.id || null,
    product: "one_core",
    amount: body.amount || 165,
    payment_method: "cardcom",
    status: "completed",
    external_id: body.transaction_id || null,
  });

  // Telegram notification
  notifyNewPayment(body.name || "(ללא שם)", body.amount || 165, "one_core");

  // Update lead status
  if (lead) {
    await supabase.from("leads").update({ current_status: "active_client" }).eq("id", lead.id);
    await supabase.from("funnel_events").insert({
      lead_id: lead.id,
      event_type: "purchased",
      metadata: { amount: body.amount, method: "cardcom" },
    });
  }

  return NextResponse.json({ customer_id: customerId }, { status: 201 });
}
