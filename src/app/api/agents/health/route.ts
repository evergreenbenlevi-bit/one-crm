import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/health — latest health for all agents
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Get latest health event per agent using distinct on
  const { data, error } = await supabase
    .from("agent_health_events")
    .select("*")
    .order("agent_slug")
    .order("checked_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate: keep only latest per agent_slug
  const latest = new Map<string, typeof data[0]>();
  for (const row of data || []) {
    if (!latest.has(row.agent_slug)) latest.set(row.agent_slug, row);
  }

  return NextResponse.json(Array.from(latest.values()));
}

// POST /api/agents/health — record health check results (batch)
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const events = Array.isArray(body) ? body : [body];

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("agent_health_events").insert(
    events.map((e: { agent_slug: string; status: string; response_ms?: number; message?: string }) => ({
      agent_slug: e.agent_slug,
      status: e.status,
      response_ms: e.response_ms || null,
      message: e.message || null,
    }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: events.length });
}
