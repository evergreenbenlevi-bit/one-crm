import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/topology — nodes + edges for React Flow
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const [registryRes, edgesRes, healthRes, costsRes, runsRes] = await Promise.all([
    supabase.from("agent_registry").select("slug,name,type,model,channel,is_active").eq("is_active", true),
    supabase.from("agent_edges").select("source_slug,target_slug,relation"),
    supabase.from("agent_health_events").select("agent_slug,status,checked_at").order("checked_at", { ascending: false }),
    supabase.from("agent_cost_logs").select("agent_slug,cost_usd").eq("date", new Date().toISOString().split("T")[0]),
    supabase.from("agent_runs").select("agent_slug").gte("started_at", new Date(Date.now() - 7 * 86400000).toISOString()),
  ]);

  if (registryRes.error) return NextResponse.json({ error: registryRes.error.message }, { status: 500 });

  const partialErrors = [edgesRes, healthRes, costsRes, runsRes]
    .filter((r) => r.error)
    .map((r) => r.error!.message);
  if (partialErrors.length > 0) console.warn("[topology] partial query errors:", partialErrors);

  // Build health map (latest per agent)
  const healthMap = new Map<string, string>();
  for (const h of healthRes.data || []) {
    if (!healthMap.has(h.agent_slug)) healthMap.set(h.agent_slug, h.status);
  }

  // Build cost map
  const costMap = new Map<string, number>();
  for (const c of costsRes.data || []) {
    costMap.set(c.agent_slug, (costMap.get(c.agent_slug) || 0) + Number(c.cost_usd));
  }

  const nodes = (registryRes.data || []).map((a) => ({
    id: a.slug,
    type: a.type,
    label: a.name,
    model: a.model,
    channel: a.channel,
    status: healthMap.get(a.slug) || "unknown",
    costToday: costMap.get(a.slug) || 0,
  }));

  // Build run volume map (runs per agent in last 7 days)
  const runVolume = new Map<string, number>();
  for (const r of runsRes.data || []) {
    runVolume.set(r.agent_slug, (runVolume.get(r.agent_slug) || 0) + 1);
  }

  const edges = (edgesRes.data || []).map((e) => ({
    source: e.source_slug,
    target: e.target_slug,
    relation: e.relation,
    volume: (runVolume.get(e.source_slug) || 0) + (runVolume.get(e.target_slug) || 0),
  }));

  return NextResponse.json({ nodes, edges });
}
