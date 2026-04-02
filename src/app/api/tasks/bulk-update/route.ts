import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { TaskPriority, TaskStatus } from "@/lib/types/tasks";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VALID_PRIORITIES: TaskPriority[] = ["p1", "p2", "p3"];
const VALID_STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "waiting_ben", "done"];

// PATCH /api/tasks/bulk-update — update multiple tasks at once
export async function PATCH(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids, updates } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: "Maximum 100 tasks per bulk update" }, { status: 400 });
  }

  if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "updates object is required" }, { status: 400 });
  }

  // Validate updates
  const allowed: Record<string, unknown> = {};
  if (updates.priority !== undefined) {
    if (!VALID_PRIORITIES.includes(updates.priority)) {
      return NextResponse.json({ error: `priority must be one of: ${VALID_PRIORITIES.join(", ")}` }, { status: 400 });
    }
    allowed.priority = updates.priority;
  }
  if (updates.status !== undefined) {
    if (!VALID_STATUSES.includes(updates.status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }
    allowed.status = updates.status;
  }
  if (updates.category !== undefined) {
    allowed.category = updates.category;
  }
  if (updates.owner !== undefined) {
    allowed.owner = updates.owner;
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No valid update fields provided" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(allowed)
    .in("id", ids)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length || 0, tasks: data });
}

// DELETE /api/tasks/bulk-update — delete multiple tasks at once
export async function DELETE(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { ids } = body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array is required" }, { status: 400 });
  }

  if (ids.length > 100) {
    return NextResponse.json({ error: "Maximum 100 tasks per bulk delete" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}
