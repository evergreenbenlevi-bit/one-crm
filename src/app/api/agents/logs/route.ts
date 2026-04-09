import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/logs — aggregated recent activity across agents
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const slug = url.searchParams.get("slug");

  const supabase = createAdminClient();

  // Combine health events as "logs" (the main activity trail we have)
  let query = supabase
    .from("agent_health_events")
    .select("id, agent_slug, status, message, checked_at")
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (slug) query = query.eq("agent_slug", slug);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
