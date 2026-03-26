import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  let query = supabase
    .from("content_ideas")
    .select("*")
    .order("sort_order", { ascending: true });

  if (type && type !== "all") query = query.eq("type", type);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const body = await request.json();
  const { data, error } = await supabase.from("content_ideas").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const body = await request.json();
  const { id, ...updates } = body;
  const { data, error } = await supabase.from("content_ideas").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const role = await getUserRole();
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { id } = await request.json();
  const { error } = await supabase.from("content_ideas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
