import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

  const program = searchParams.get("program");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const source = searchParams.get("source");

  if (program) query = query.eq("program", program);
  if (status) query = query.eq("current_status", status);
  if (source) query = query.eq("source", source);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "שם הוא שדה חובה" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: body.name.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      occupation: body.occupation?.trim() || null,
      source: body.source || "other",
      program: body.program || "one_vip",
      current_status: "new",
      ad_name: body.ad_name?.trim() || null,
      campaign_id: body.campaign_id?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log funnel event
  await supabase.from("funnel_events").insert({
    lead_id: data.id,
    event_type: "registered",
    metadata: { source: "manual" },
  });

  return NextResponse.json(data, { status: 201 });
}
