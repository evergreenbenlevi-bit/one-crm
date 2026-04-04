import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { TaskLayer, TaskImpact, TaskSize, TaskStatus, EstimatedMinutes } from "@/lib/types/tasks";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VALID_LAYERS: TaskLayer[] = ["needle_mover", "project", "quick_win", "wishlist", "nice_to_have"];
const VALID_IMPACTS: TaskImpact[] = ["needle_mover", "important", "nice"];
const VALID_SIZES: TaskSize[] = ["quick", "medium", "big"];
const VALID_STATUSES: TaskStatus[] = ["inbox", "up_next", "scheduled", "in_progress", "waiting", "waiting_ben", "done", "someday", "archived", "backlog", "todo"];
const VALID_ESTIMATED_MINUTES: EstimatedMinutes[] = [5, 15, 30, 45, 60, 90, 120];

// PATCH /api/triage — bulk update triage fields (layer, impact, size, status)
// Body: { updates: Array<{ id: string; layer?: TaskLayer; impact?: TaskImpact; size?: TaskSize; status?: TaskStatus }> }
export async function PATCH(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: { id: string; layer?: TaskLayer; impact?: TaskImpact; size?: TaskSize; status?: TaskStatus; estimated_minutes?: EstimatedMinutes }[] = body.updates ?? [];

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates array required" }, { status: 400 });
  }

  // Validate all entries
  for (const u of updates) {
    if (!u.id) return NextResponse.json({ error: "Each update needs an id" }, { status: 400 });
    if (u.layer && !VALID_LAYERS.includes(u.layer)) return NextResponse.json({ error: `Invalid layer: ${u.layer}` }, { status: 400 });
    if (u.impact && !VALID_IMPACTS.includes(u.impact)) return NextResponse.json({ error: `Invalid impact: ${u.impact}` }, { status: 400 });
    if (u.size && !VALID_SIZES.includes(u.size)) return NextResponse.json({ error: `Invalid size: ${u.size}` }, { status: 400 });
    if (u.status && !VALID_STATUSES.includes(u.status)) return NextResponse.json({ error: `Invalid status: ${u.status}` }, { status: 400 });
    if (u.estimated_minutes && !VALID_ESTIMATED_MINUTES.includes(u.estimated_minutes)) return NextResponse.json({ error: `Invalid estimated_minutes: ${u.estimated_minutes}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch current values for logging
  const taskIds = updates.map(u => u.id);
  const { data: currentTasks } = await supabase.from("tasks").select("id, layer, impact, size, status, estimated_minutes").in("id", taskIds);
  const oldMap = new Map((currentTasks || []).map(t => [t.id, t]));

  const results = await Promise.allSettled(
    updates.map(({ id, ...fields }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (fields.layer) updateData.layer = fields.layer;
      if (fields.impact) updateData.impact = fields.impact;
      if (fields.size) updateData.size = fields.size;
      if (fields.status) updateData.status = fields.status;
      if (fields.estimated_minutes) updateData.estimated_minutes = fields.estimated_minutes;
      return supabase.from("tasks").update(updateData).eq("id", id);
    })
  );

  // Log changes
  const activities: { task_id: string; activity_type: string; actor: string; field_name: string; old_value: string | null; new_value: string }[] = [];
  for (const u of updates) {
    const old = oldMap.get(u.id);
    if (!old) continue;
    for (const field of ["layer", "impact", "size", "status", "estimated_minutes"] as const) {
      if (u[field] && old[field] !== u[field]) {
        activities.push({
          task_id: u.id,
          activity_type: field === "status" ? "status_change" : "field_change",
          actor: "ben",
          field_name: field,
          old_value: old[field] != null ? String(old[field]) : null,
          new_value: String(u[field]),
        });
      }
    }
  }

  if (activities.length > 0) {
    await supabase.from("task_activity").insert(activities);
  }

  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({ updated: updates.length - failed, failed });
}
