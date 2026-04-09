import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/health/[slug] — health history for one agent
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_health_events")
    .select("*")
    .eq("agent_slug", slug)
    .order("checked_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
