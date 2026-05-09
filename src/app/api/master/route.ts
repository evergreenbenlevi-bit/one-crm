import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

const VALID_PROJECT_STATUSES = ["active", "paused", "done", "archived"] as const;
const VALID_TASK_STATUSES = ["open", "in_progress", "waiting", "done"] as const;

// ── GET /api/master ──
// Returns full hierarchy: parent → children → phases → tasks
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: parent, error: parentErr } = await supabase
    .from("projects")
    .select("*")
    .eq("portfolio", "benlevi-master")
    .is("parent_project_id", null)
    .single();

  if (parentErr || !parent) {
    return NextResponse.json(
      { error: "Master project not found. Run: npx tsx scripts/seed-master-plan.ts" },
      { status: 404 }
    );
  }

  const { data: children, error: childErr } = await supabase
    .from("projects")
    .select("*")
    .eq("parent_project_id", parent.id)
    .order("position");

  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });

  const allIds = [parent.id, ...(children ?? []).map((c: { id: string }) => c.id)];

  const { data: tasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("*")
    .in("project_id", allIds)
    .order("phase")
    .order("position");

  if (tasksErr) return NextResponse.json({ error: tasksErr.message }, { status: 500 });

  function groupByPhase(projectTasks: typeof tasks) {
    const phaseMap: Record<string, typeof tasks> = {};
    for (const t of projectTasks ?? []) {
      const phase = (t.phase as string) ?? "General";
      if (!phaseMap[phase]) phaseMap[phase] = [];
      phaseMap[phase]!.push(t);
    }
    return Object.entries(phaseMap).map(([name, phaseTasks]) => ({ name, tasks: phaseTasks }));
  }

  const tasksByProject: Record<string, typeof tasks> = {};
  for (const task of tasks ?? []) {
    const pid = task.project_id as string;
    if (!tasksByProject[pid]) tasksByProject[pid] = [];
    tasksByProject[pid]!.push(task);
  }

  return NextResponse.json({
    parent: {
      ...parent,
      phases: groupByPhase(tasksByProject[parent.id] ?? []),
      task_count: (tasksByProject[parent.id] ?? []).length,
    },
    children: (children ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      phases: groupByPhase(tasksByProject[c.id as string] ?? []),
      task_count: (tasksByProject[c.id as string] ?? []).length,
    })),
  });
}

// ── PATCH /api/master ──
// body: { type: 'project' | 'task', id: string, status?: string, title?: string }
export async function PATCH(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    type: "project" | "task";
    id: string;
    status?: string;
    title?: string;
  };

  const { type, id, status, title } = body;
  if (!type || !id) return NextResponse.json({ error: "type and id required" }, { status: 400 });

  const supabase = createAdminClient();
  const updates: Record<string, unknown> = {};

  if (status !== undefined) {
    const validList = type === "project" ? VALID_PROJECT_STATUSES : VALID_TASK_STATUSES;
    if (!validList.includes(status as never)) {
      return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
    }
    updates.status = status;
  }
  if (title !== undefined) updates.title = title.trim();

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const table = type === "project" ? "projects" : "tasks";
  const { data, error } = await supabase.from(table).update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
