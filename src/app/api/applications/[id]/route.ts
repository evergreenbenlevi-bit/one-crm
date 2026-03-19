import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select("*, leads(name, email, phone, occupation)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const updateData: Record<string, unknown> = {};

  if (body.status === "approved" || body.status === "rejected") {
    updateData.status = body.status;
    updateData.reviewed_at = new Date().toISOString();
    if (body.reviewed_by) updateData.reviewed_by = body.reviewed_by;
  }

  const { data, error } = await supabase
    .from("applications")
    .update(updateData)
    .eq("id", id)
    .select("*, leads(id, name, email, phone, occupation)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-update lead status when approved → qualified | rejected → lost
  if (data?.leads?.id) {
    if (body.status === "approved") {
      await supabase.from("leads").update({ current_status: "qualified" }).eq("id", data.leads.id);
      await supabase.from("funnel_events").insert({ lead_id: data.leads.id, event_type: "qualified", metadata: { source: "application_approved" } });
    } else if (body.status === "rejected") {
      await supabase.from("leads").update({ current_status: "lost" }).eq("id", data.leads.id);
      await supabase.from("funnel_events").insert({ lead_id: data.leads.id, event_type: "lost", metadata: { source: "application_rejected" } });
    }
  }

  return NextResponse.json(data);
}
