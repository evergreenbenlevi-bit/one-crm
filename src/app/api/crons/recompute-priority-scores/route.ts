// Prefer EU regions (Frankfurt/Stockholm) — closer to Israel than default US East
export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

// Called daily at 06:00 via LaunchAgent or external cron
// Recomputes priority_score for all non-archived tasks (deadline_urgency changes daily)
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("recompute_all_priority_scores");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    updated: data,
    timestamp: new Date().toISOString(),
  });
}
