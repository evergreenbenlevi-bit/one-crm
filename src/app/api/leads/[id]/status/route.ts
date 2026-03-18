import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { status } = await request.json();

  const { data, error } = await supabase
    .from("leads")
    .update({ current_status: status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also create a funnel event
  await supabase.from("funnel_events").insert({
    lead_id: id,
    event_type: status === "active_client" ? "purchased" : status,
    metadata: {},
  });

  return NextResponse.json(data);
}
