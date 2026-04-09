import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/costs?from=2026-04-01&to=2026-04-09&slug=cmo
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const slug = url.searchParams.get("slug");

  const supabase = createAdminClient();
  let query = supabase
    .from("agent_cost_logs")
    .select("*")
    .order("date", { ascending: false });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);
  if (slug) query = query.eq("agent_slug", slug);

  const { data, error } = await query.limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/agents/costs — ingest cost data (upsert per agent+date)
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const entries = Array.isArray(body) ? body : [body];

  const supabase = createAdminClient();
  const { error } = await supabase.from("agent_cost_logs").upsert(
    entries.map((e: Record<string, unknown>) => ({
      agent_slug: e.agent_slug,
      date: e.date || new Date().toISOString().split("T")[0],
      input_tokens: e.input_tokens || 0,
      output_tokens: e.output_tokens || 0,
      cache_read_tokens: e.cache_read_tokens || 0,
      cost_usd: e.cost_usd || 0,
      session_count: e.session_count || 0,
      metadata: e.metadata || {},
    })),
    { onConflict: "agent_slug,date" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ upserted: entries.length });
}
