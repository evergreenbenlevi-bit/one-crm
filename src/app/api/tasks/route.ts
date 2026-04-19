import { NextRequest, NextResponse } from "next/server";

// Prefer EU regions (Frankfurt/Stockholm) — closer to Israel than default US East
export const preferredRegion = ["fra1", "arn1", "cdg1"];
import { isLocalMode, getAllTasks, createTask, updateTask, deleteTask } from "@/lib/tasks-store";
import type { TaskStatus, TaskPriority, TaskOwner, TaskCategory, TaskImpact, TaskSize, EstimatedMinutes } from "@/lib/types/tasks";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import { syncTaskToCalendar } from "@/lib/calendar-sync";

// ── Valid enums for input validation ──
const VALID_PRIORITIES: TaskPriority[] = ["p0", "p1", "p2", "p3"];
const VALID_STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "waiting_ben", "done", "inbox", "up_next", "scheduled", "waiting", "someday", "archived"];
const VALID_OWNERS: TaskOwner[] = ["claude", "ben", "both", "avitar"];
const VALID_CATEGORIES: TaskCategory[] = ["one_tm", "self", "brand", "temp", "research", "infrastructure", "personal", "errands"];
const VALID_IMPACTS: TaskImpact[] = ["needle_mover", "important", "nice"];
const VALID_SIZES: TaskSize[] = ["quick", "medium", "big"];
const VALID_ESTIMATED_MINUTES: EstimatedMinutes[] = [5, 15, 30, 45, 60, 90, 120, 180];

// Size → estimated_minutes preset (spec section 8)
const SIZE_PRESETS: Record<string, EstimatedMinutes> = {
  quick: 15,
  medium: 60,
  big: 180,
};

// ── Time slot auto-assignment (spec section 7, priority order) ──
function autoTimeSlot(impact: string | null, size: string | null, due_date: string | null): string {
  if (impact === "needle_mover") return "morning";
  if (size === "big") return "morning";
  if (size === "quick" && due_date && due_date > new Date().toISOString().split("T")[0]) return "evening";
  return "any";
}

// ── Validation helpers ──
function validateTaskFields(body: Record<string, unknown>, requireTitle = false): string | null {
  if (requireTitle && (!body.title || typeof body.title !== "string" || !body.title.trim())) {
    return "title is required";
  }
  if (body.title !== undefined && (typeof body.title !== "string" || body.title.trim().length > 500)) {
    return "title must be a string under 500 characters";
  }
  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority as TaskPriority)) {
    return `priority must be one of: ${VALID_PRIORITIES.join(", ")}`;
  }
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status as TaskStatus)) {
    return `status must be one of: ${VALID_STATUSES.join(", ")}`;
  }
  if (body.owner !== undefined && !VALID_OWNERS.includes(body.owner as TaskOwner)) {
    return `owner must be one of: ${VALID_OWNERS.join(", ")}`;
  }
  if (body.category !== undefined && !VALID_CATEGORIES.includes(body.category as TaskCategory)) {
    return `category must be one of: ${VALID_CATEGORIES.join(", ")}`;
  }
  if (body.impact !== undefined && body.impact !== null && !VALID_IMPACTS.includes(body.impact as TaskImpact)) {
    return `impact must be one of: ${VALID_IMPACTS.join(", ")}`;
  }
  if (body.size !== undefined && body.size !== null && !VALID_SIZES.includes(body.size as TaskSize)) {
    return `size must be one of: ${VALID_SIZES.join(", ")}`;
  }
  if (body.estimated_minutes !== undefined && body.estimated_minutes !== null && !VALID_ESTIMATED_MINUTES.includes(body.estimated_minutes as EstimatedMinutes)) {
    return `estimated_minutes must be one of: ${VALID_ESTIMATED_MINUTES.join(", ")}`;
  }
  if (body.due_date !== undefined && body.due_date !== null) {
    if (typeof body.due_date !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(body.due_date)) {
      return "due_date must be a valid date string (YYYY-MM-DD)";
    }
  }
  if (body.time_slot !== undefined && body.time_slot !== null) {
    const VALID_TIME_SLOTS = ["morning", "afternoon", "evening", "any"];
    if (!VALID_TIME_SLOTS.includes(body.time_slot as string)) {
      return `time_slot must be one of: ${VALID_TIME_SLOTS.join(", ")}`;
    }
  }
  return null;
}

// ── GET /api/tasks ──
export async function GET(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  if (isLocalMode) {
    const tasks = getAllTasks({
      status: searchParams.get("status") as TaskStatus | undefined || undefined,
      priority: searchParams.get("priority") as TaskPriority | undefined || undefined,
      owner: searchParams.get("owner") as TaskOwner | undefined || undefined,
      category: searchParams.get("category") as TaskCategory | undefined || undefined,
    });
    return NextResponse.json(tasks);
  }

  const supabase = createAdminClient();
  let query = supabase.from("tasks").select("*");

  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const owner = searchParams.get("owner");
  const category = searchParams.get("category");
  const parent_id = searchParams.get("parent_id");

  // Archived filter
  const showArchived = searchParams.get("archived");
  if (showArchived === "1") {
    query = query.not("archived_at", "is", null);
  } else {
    query = query.is("archived_at", null);
  }

  if (status && VALID_STATUSES.includes(status as TaskStatus)) query = query.eq("status", status);
  // Lazy load: exclude backlog on initial fetch for fast page load
  if (!status && searchParams.get("exclude_backlog") === "1") query = query.neq("status", "backlog").neq("status", "done");
  if (priority && VALID_PRIORITIES.includes(priority as TaskPriority)) query = query.eq("priority", priority);
  if (owner && VALID_OWNERS.includes(owner as TaskOwner)) query = query.eq("owner", owner);
  if (category && VALID_CATEGORIES.includes(category as TaskCategory)) query = query.eq("category", category);
  if (parent_id) query = query.eq("parent_id", parent_id);

  const impact = searchParams.get("impact");
  const size = searchParams.get("size");
  if (impact && VALID_IMPACTS.includes(impact as TaskImpact)) query = query.eq("impact", impact);
  if (size && VALID_SIZES.includes(size as TaskSize)) query = query.eq("size", size);

  const limit = searchParams.get("limit");
  const parsedLimit = limit ? parseInt(limit, 10) : 200;
  if (parsedLimit > 0 && parsedLimit <= 1000) query = query.limit(parsedLimit);

  const { data, error } = await query.order("position").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── POST /api/tasks ──
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const validationError = validateTaskFields(body, true);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const sanitized = {
    title: (body.title as string).trim(),
    description: body.description?.trim() || null,
    priority: body.priority || "p2",
    status: body.status || "todo",
    owner: body.owner || "claude",
    category: body.category || "one_tm",
    due_date: body.due_date || null,
    position: typeof body.position === "number" ? body.position : 0,
    source: body.source || null,
    source_date: body.source_date || null,
    depends_on: body.depends_on || null,
    parent_id: body.parent_id || null,
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string").slice(0, 20) : [],
    is_recurring: Boolean(body.is_recurring) || false,
    recur_pattern: body.is_recurring && body.recur_pattern ? String(body.recur_pattern) : null,
    impact: body.impact || "important",
    size: body.size || "medium",
    estimated_minutes: typeof body.estimated_minutes === "number"
      ? body.estimated_minutes
      : SIZE_PRESETS[body.size as string] ?? null,
    time_slot: body.time_slot || autoTimeSlot(body.impact as string, body.size as string, body.due_date as string),
    actual_minutes: typeof body.actual_minutes === "number" ? body.actual_minutes : null,
    project_id: body.project_id || null,
  };

  if (isLocalMode) {
    const task = createTask(sanitized);
    return NextResponse.json(task, { status: 201 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tasks").insert([sanitized]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calendar sync — fire-and-forget, silent fail
  if (data?.due_date && data?.time_slot && data.time_slot !== "any") {
    syncTaskToCalendar({
      taskId: data.id,
      title: data.title,
      due_date: data.due_date,
      time_slot: data.time_slot,
      estimated_minutes: data.estimated_minutes ?? null,
    }).catch(() => {});
  }

  return NextResponse.json(data, { status: 201 });
}

// ── PATCH /api/tasks ──
export async function PATCH(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...rawUpdates } = body;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const validationError = validateTaskFields(rawUpdates);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (rawUpdates.title !== undefined) updates.title = (rawUpdates.title as string).trim();
  if (rawUpdates.description !== undefined) updates.description = rawUpdates.description?.trim() || null;
  if (rawUpdates.priority !== undefined) updates.priority = rawUpdates.priority;
  if (rawUpdates.status !== undefined) updates.status = rawUpdates.status;
  if (rawUpdates.owner !== undefined) updates.owner = rawUpdates.owner;
  if (rawUpdates.category !== undefined) updates.category = rawUpdates.category;
  if (rawUpdates.due_date !== undefined) updates.due_date = rawUpdates.due_date || null;
  if (rawUpdates.position !== undefined) updates.position = rawUpdates.position;
  if (rawUpdates.tags !== undefined) updates.tags = Array.isArray(rawUpdates.tags)
    ? rawUpdates.tags.filter((t: unknown) => typeof t === "string").slice(0, 20)
    : [];
  if (rawUpdates.effort !== undefined) {
    const validEfforts = ["quick", "small", "medium", "large"];
    updates.effort = validEfforts.includes(rawUpdates.effort as string) ? rawUpdates.effort : null;
  }
  if (rawUpdates.impact !== undefined) {
    updates.impact = VALID_IMPACTS.includes(rawUpdates.impact as TaskImpact) ? rawUpdates.impact : null;
  }
  if (rawUpdates.size !== undefined) {
    updates.size = VALID_SIZES.includes(rawUpdates.size as TaskSize) ? rawUpdates.size : null;
  }
  if (rawUpdates.estimated_minutes !== undefined) {
    updates.estimated_minutes = VALID_ESTIMATED_MINUTES.includes(rawUpdates.estimated_minutes as EstimatedMinutes) ? rawUpdates.estimated_minutes : null;
  }
  if (rawUpdates.is_recurring !== undefined) updates.is_recurring = Boolean(rawUpdates.is_recurring);
  if (rawUpdates.recur_pattern !== undefined) updates.recur_pattern = rawUpdates.is_recurring && rawUpdates.recur_pattern ? String(rawUpdates.recur_pattern) : null;
  if (rawUpdates.time_slot !== undefined) updates.time_slot = rawUpdates.time_slot || "any";
  if (rawUpdates.actual_minutes !== undefined) updates.actual_minutes = typeof rawUpdates.actual_minutes === "number" ? rawUpdates.actual_minutes : null;
  if (rawUpdates.manually_positioned !== undefined) updates.manually_positioned = Boolean(rawUpdates.manually_positioned);
  if (rawUpdates.project_id !== undefined) updates.project_id = rawUpdates.project_id || null;

  if (isLocalMode) {
    const task = updateTask(id, updates);
    if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(task);
  }

  const supabase = createAdminClient();

  // Fetch current task for change logging
  const { data: currentTask } = await supabase.from("tasks").select("*").eq("id", id).single();

  const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Calendar sync when due_date or time_slot changed — fire-and-forget
  const slotChanged = updates.due_date !== undefined || updates.time_slot !== undefined;
  if (slotChanged && data?.due_date && data?.time_slot && data.time_slot !== "any") {
    syncTaskToCalendar({
      taskId: data.id,
      title: data.title,
      due_date: data.due_date as string,
      time_slot: data.time_slot as string,
      estimated_minutes: (data.estimated_minutes as number | null) ?? null,
    }).catch(() => {});
  }

  // Auto-log changes to task_activity
  if (currentTask) {
    const trackedFields = ["status", "priority", "category", "owner", "due_date", "title", "effort", "impact", "size", "estimated_minutes", "time_slot", "project_id"];
    const activities: { task_id: string; activity_type: string; actor: string; content?: string; field_name?: string; old_value?: string; new_value?: string }[] = [];

    for (const field of trackedFields) {
      const oldVal = currentTask[field];
      const newVal = (updates as Record<string, unknown>)[field];
      if (newVal !== undefined && String(oldVal ?? "") !== String(newVal ?? "")) {
        const actType = field === "status" ? "status_change" : "field_change";
        activities.push({
          task_id: id,
          activity_type: actType,
          actor: "ben",
          field_name: field,
          old_value: oldVal != null ? String(oldVal) : null as unknown as string,
          new_value: newVal != null ? String(newVal) : null as unknown as string,
        });

        // Special: completion
        if (field === "status" && newVal === "done" && oldVal !== "done") {
          activities.push({
            task_id: id,
            activity_type: "completed",
            actor: "ben",
            content: rawUpdates.completion_summary as string || null as unknown as string,
          });
        }
      }
    }

    if (activities.length > 0) {
      await supabase.from("task_activity").insert(activities);
    }
  }

  return NextResponse.json(data);
}

// ── DELETE /api/tasks ──
export async function DELETE(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  if (isLocalMode) {
    const ok = deleteTask(id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
