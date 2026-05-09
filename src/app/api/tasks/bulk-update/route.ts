import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { TaskPriority, TaskStatus } from "@/lib/types/tasks";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VALID_PRIORITIES: TaskPriority[] = ["p1", "p2", "p3"];
const VALID_STATUSES: TaskStatus[] = ["open", "in_progress", "waiting", "done"];

// Per-item update shape used for position persistence (DnD reorder)
interface PerItemUpdate {
  id: string;
  position?: number;
  status?: TaskStatus;
}

// PATCH /api/tasks/bulk-update — two modes:
//   1. Shared update: { ids: string[], updates: object } — apply same fields to all ids
//   2. Per-item update: { updates: PerItemUpdate[] } — apply different fields per task (used for DnD position persistence)
export async function PATCH(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // ── Mode 2: per-item position/status updates (DnD reorder) ──
  if (Array.isArray(body.updates)) {
    const items: PerItemUpdate[] = body.updates;

    if (items.length === 0) {
      return NextResponse.json({ error: "updates array must not be empty" }, { status: 400 });
    }
    if (items.length > 200) {
      return NextResponse.json({ error: "Maximum 200 items per bulk position update" }, { status: 400 });
    }

    // Validate each item
    for (const item of items) {
      if (!item.id || typeof item.id !== "string") {
        return NextResponse.json({ error: "Each update item must have a string id" }, { status: 400 });
      }
      if (item.position !== undefined && (typeof item.position !== "number" || !Number.isFinite(item.position))) {
        return NextResponse.json({ error: `Invalid position for task ${item.id}` }, { status: 400 });
      }
      if (item.status !== undefined && !VALID_STATUSES.includes(item.status)) {
        return NextResponse.json({ error: `Invalid status "${item.status}" for task ${item.id}` }, { status: 400 });
      }
    }

    const supabase = createAdminClient();
    // Execute individual updates in parallel — Supabase doesn't support per-row upsert with different values in one query
    const results = await Promise.all(
      items.map(async (item) => {
        const patch: Record<string, unknown> = {};
        if (item.position !== undefined) patch.position = item.position;
        if (item.status !== undefined) patch.status = item.status;
        if (Object.keys(patch).length === 0) return { id: item.id, ok: true };

        const { error } = await supabase.from("tasks").update(patch).eq("id", item.id);
        return { id: item.id, ok: !error, error: error?.message };
      })
    );

    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      return NextResponse.json({ error: "Some updates failed", failed }, { status: 500 });
    }

    return NextResponse.json({ updated: items.length });
  }

  // ── Mode 1: shared update across all ids ──
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
