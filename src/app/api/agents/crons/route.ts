import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/agents/crons — list all cron-type agents from Supabase registry
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("agent_registry")
    .select("*")
    .eq("type", "cron")
    .order("slug");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Map registry rows to CronInfo shape for the frontend
  const crons = (data || []).map((row) => ({
    label: row.slug,
    name: row.name,
    script_path: row.file_path || "",
    schedule: (row.config as Record<string, string>)?.schedule || "",
    is_loaded: row.is_active,
    description: row.description,
  }));

  return NextResponse.json(crons);
}
