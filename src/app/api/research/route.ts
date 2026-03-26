import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  let query = supabase
    .from("research_items")
    .select("*")
    .order("research_date", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (category && category !== "all") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("research_items").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const body = await request.json();
  const { id, ...updates } = body;
  const { data, error } = await supabase.from("research_items").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
