import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createAdminClient();

  const [levelsRes, modulesRes] = await Promise.all([
    supabase.from("course_levels").select("*").order("position"),
    supabase.from("course_modules").select("*").order("level_id").order("position"),
  ]);

  if (levelsRes.error) return NextResponse.json({ error: levelsRes.error.message }, { status: 500 });
  if (modulesRes.error) return NextResponse.json({ error: modulesRes.error.message }, { status: 500 });

  return NextResponse.json({ levels: levelsRes.data, modules: modulesRes.data });
}

export async function PATCH(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { table, id, updates } = body;

  if (!table || !id || !updates) {
    return NextResponse.json({ error: "Missing table, id, or updates" }, { status: 400 });
  }

  if (table !== "course_levels" && table !== "course_modules") {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const { data, error } = await supabase.from(table).update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient();
  const body = await req.json();
  const { table, data: insertData } = body;

  if (table !== "course_modules") {
    return NextResponse.json({ error: "Can only add modules" }, { status: 400 });
  }

  const { data, error } = await supabase.from(table).insert(insertData).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("course_modules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
