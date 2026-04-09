import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/registry — list all agents with optional filters
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const active = url.searchParams.get("active");

  let query = supabase
    .from("agent_registry")
    .select("*")
    .order("type")
    .order("name");

  if (type) query = query.eq("type", type);
  if (active !== null) query = query.eq("is_active", active !== "false");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/agents/registry — upsert a single agent
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.slug || !body.name || !body.type) {
    return NextResponse.json({ error: "slug, name, type required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_registry")
    .upsert(
      { ...body, updated_at: new Date().toISOString() },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
