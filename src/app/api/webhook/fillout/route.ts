import { createAdminClient } from "@/lib/supabase/admin";
import { notifyNewLead } from "@/lib/telegram";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createAdminClient();

  // Create lead
  const { data: lead, error } = await supabase.from("leads").insert({
    name: body.name || "",
    email: body.email || null,
    phone: body.phone || null,
    source: body.source || "campaign",
    campaign_id: body.campaign_id || null,
    ad_id: body.ad_id || null,
    ad_name: body.ad_name || null,
    program: body.program || body.product || "one_core",
    current_status: "new",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Telegram notification
  notifyNewLead(
    lead.name || "(ללא שם)",
    lead.source || "campaign",
    lead.current_status || "new",
  );

  // Create funnel event
  await supabase.from("funnel_events").insert({
    lead_id: lead.id,
    event_type: "registered",
    metadata: body.metadata || {},
  });

  return NextResponse.json(lead, { status: 201 });
}
