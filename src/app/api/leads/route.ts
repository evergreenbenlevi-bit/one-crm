export const runtime = 'edge';

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";

// Valid enum values for input validation
const VALID_SOURCES = ["meta_ad", "google_ad", "instagram", "referral", "organic", "website", "other"];
const VALID_PROGRAMS = ["one_vip", "one_core"];
const VALID_STATUSES = ["new", "consumed_content", "engaged", "applied", "qualified", "onboarding", "active_client", "completed", "lost"];

// Sanitize string to prevent injection in Supabase .or() filters
function sanitizeFilterValue(val: string): string {
  // Remove characters that could break Supabase PostgREST filter syntax
  return val.replace(/[(),.'";\\%_]/g, "").trim();
}

const LEAD_LIST_FIELDS = "id,name,email,phone,program,interest_program,current_status,source,created_at,updated_at,instagram_handle,occupation";

export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;

  let query = supabase.from("leads").select(LEAD_LIST_FIELDS).order("created_at", { ascending: false });

  const program = searchParams.get("program");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const source = searchParams.get("source");

  // Validate + sanitize filter values before using in queries
  if (program) {
    if (!VALID_PROGRAMS.includes(program)) {
      return NextResponse.json({ error: "Invalid program filter" }, { status: 400 });
    }
    query = query.or(`program.eq.${program},interest_program.eq.${program}`);
  }

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
    query = query.eq("current_status", status);
  }

  if (source) {
    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: "Invalid source filter" }, { status: 400 });
    }
    query = query.eq("source", source);
  }

  if (search) {
    const safeSearch = sanitizeFilterValue(search).slice(0, 100);
    if (safeSearch.length > 0) {
      query = query.or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`);
    }
  }

  // Pagination: default limit 100
  const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await request.json();

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "שם הוא שדה חובה" }, { status: 400 });
  }
  if (body.name.trim().length > 200) {
    return NextResponse.json({ error: "שם ארוך מדי (מקסימום 200 תווים)" }, { status: 400 });
  }

  // Validate enum fields
  const program = body.program || "one_vip";
  if (!VALID_PROGRAMS.includes(program)) {
    return NextResponse.json({ error: "Invalid program" }, { status: 400 });
  }
  const source = body.source || "other";
  if (!VALID_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  // Validate email format if provided
  if (body.email && typeof body.email === "string" && body.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json({ error: "כתובת אימייל לא תקינה" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: body.name.trim().slice(0, 200),
      email: body.email?.trim()?.slice(0, 200) || null,
      phone: body.phone?.trim()?.slice(0, 30) || null,
      occupation: body.occupation?.trim()?.slice(0, 200) || null,
      source,
      program,
      interest_program: program,
      current_status: "new",
      ad_name: body.ad_name?.trim()?.slice(0, 200) || null,
      campaign_id: body.campaign_id?.trim()?.slice(0, 100) || null,
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
