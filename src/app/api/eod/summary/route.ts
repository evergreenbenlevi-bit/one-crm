import { NextRequest, NextResponse } from "next/server";

// Prefer EU regions (Frankfurt/Stockholm) — closer to Israel than default US East
export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

// GET /api/eod/summary
// Returns end-of-day task summary + fitness stub for Mike routing
// Spec: TASK-MANAGER-REDESIGN-SPEC-V2.md section 9
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Parallel queries
  const [openRes, overdueRes, completedRes] = await Promise.all([
    // Open tasks with deadline today or earlier (not done/archived)
    supabase
      .from("tasks")
      .select("id,title,status,priority,impact,size,due_date,estimated_minutes,actual_minutes,priority_score,project_id,time_slot")
      .not("status", "in", '("done","archived")')
      .lte("due_date", today)
      .is("archived_at", null)
      .order("priority_score", { ascending: false }),

    // Overdue: past deadline, not done
    supabase
      .from("tasks")
      .select("id,title,status,priority,impact,due_date,estimated_minutes,priority_score")
      .not("status", "in", '("done","archived")')
      .lt("due_date", today)
      .is("archived_at", null)
      .order("priority_score", { ascending: false }),

    // Completed today
    supabase
      .from("tasks")
      .select("id,title,priority,impact,estimated_minutes,actual_minutes,completed_at")
      .eq("status", "done")
      .gte("completed_at", `${today}T00:00:00Z`)
      .lte("completed_at", `${today}T23:59:59Z`),
  ]);

  // Sum actual_minutes logged today from completed tasks
  const time_logged = (completedRes.data ?? []).reduce(
    (sum: number, t: { actual_minutes: number | null }) => sum + (t.actual_minutes ?? 0),
    0
  );

  return NextResponse.json({
    date: today,
    open_tasks: openRes.data ?? [],
    overdue_tasks: overdueRes.data ?? [],
    completed_today: completedRes.data ?? [],
    time_logged,
    stats: {
      open_count: (openRes.data ?? []).length,
      overdue_count: (overdueRes.data ?? []).length,
      completed_count: (completedRes.data ?? []).length,
    },
    fitness_stub: {
      steps: null,
      workout: null,
      nutrition: null,
      energy_score: null,
    },
  });
}
