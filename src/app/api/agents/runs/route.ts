import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/runs — list recent agent runs with optional filters
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const traceId = url.searchParams.get("trace_id");

  const supabase = createAdminClient();

  let query = supabase
    .from("agent_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (slug) query = query.eq("agent_slug", slug);
  if (status) query = query.eq("status", status);
  if (traceId) query = query.eq("trace_id", traceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

// POST /api/agents/runs — record a new agent run
export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("agent_runs")
    .insert({
      agent_slug: body.agent_slug,
      trace_id: body.trace_id,
      parent_trace_id: body.parent_trace_id || null,
      status: body.status || "running",
      input_tokens: body.input_tokens || 0,
      output_tokens: body.output_tokens || 0,
      cost_usd: body.cost_usd || 0,
      duration_ms: body.duration_ms || null,
      ended_at: body.ended_at || null,
      error_message: body.error_message || null,
      metadata: body.metadata || {},
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
