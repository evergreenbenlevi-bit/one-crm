import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Returns Monday of the given date's week
function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

// GET /api/big3/week?date=YYYY-MM-DD
// Returns big3_projects + their tasks for the week containing ?date (defaults to today)
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const weekStart = getMondayOf(targetDate);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data: projects, error } = await supabase
    .from("big3_projects")
    .select("*, tasks:big3_tasks(*)")
    .eq("week_start", weekStart)
    .order("position");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ week_start: weekStart, projects: projects ?? [] });
}

// POST /api/big3/week — create or replace a project for the week
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, description, why_now, success_definition, type, position, week_start } = body;

  if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!week_start) return NextResponse.json({ error: "week_start is required" }, { status: 400 });

  const VALID_TYPES = ["needle_mover", "build", "maintenance"];
  if (type && !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("big3_projects")
    .insert([{
      user_id: user.id,
      week_start,
      name: name.trim(),
      description: description?.trim() || null,
      why_now: why_now?.trim() || null,
      success_definition: success_definition?.trim() || null,
      type: type || "needle_mover",
      position: position || 1,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
