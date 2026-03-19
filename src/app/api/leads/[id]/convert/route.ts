import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/leads/:id/convert — creates a Customer from a Lead
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json(); // { program, program_start_date?, payment_method?, amount? }

  // Fetch the lead
  const { data: lead, error: leadError } = await supabase.from("leads").select("*").eq("id", id).single();
  if (leadError || !lead) return NextResponse.json({ error: "ליד לא נמצא" }, { status: 404 });

  // Create customer
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      lead_id: id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      occupation: lead.occupation,
      program: body.program || lead.program || "one_vip",
      status: "active",
      total_paid: body.amount || 0,
      payment_status: "completed",
      program_start_date: body.program_start_date || new Date().toISOString(),
      current_month: 1,
    })
    .select()
    .single();

  if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });

  // Update lead status to active_client
  await supabase.from("leads").update({ current_status: "active_client" }).eq("id", id);

  // Log funnel event
  await supabase.from("funnel_events").insert({
    lead_id: id,
    event_type: "purchased",
    metadata: { customer_id: customer.id, program: body.program || lead.program },
  });

  return NextResponse.json(customer, { status: 201 });
}
