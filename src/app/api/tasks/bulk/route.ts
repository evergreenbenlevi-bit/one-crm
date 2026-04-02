import { NextRequest, NextResponse } from "next/server";
import { isLocalMode, bulkCreateTasks } from "@/lib/tasks-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { TaskPriority, TaskStatus, TaskOwner, TaskCategory } from "@/lib/types/tasks";

const VALID_PRIORITIES: TaskPriority[] = ["p1", "p2", "p3"];
const VALID_STATUSES: TaskStatus[] = ["backlog", "todo", "in_progress", "waiting_ben", "done"];
const VALID_OWNERS: TaskOwner[] = ["claude", "ben", "both", "avitar"];
const VALID_CATEGORIES: TaskCategory[] = ["one_tm", "self", "brand", "temp", "research", "infrastructure", "personal", "errands"];

interface RawTask {
  title?: unknown;
  description?: unknown;
  priority?: unknown;
  status?: unknown;
  owner?: unknown;
  category?: unknown;
  due_date?: unknown;
  position?: unknown;
  source?: unknown;
  source_date?: unknown;
}

function sanitizeTask(raw: RawTask) {
  if (!raw.title || typeof raw.title !== "string" || !raw.title.trim()) return null;
  return {
    title: raw.title.trim().slice(0, 500),
    description: typeof raw.description === "string" ? raw.description.trim() : null,
    priority: VALID_PRIORITIES.includes(raw.priority as TaskPriority) ? raw.priority : "p2",
    status: VALID_STATUSES.includes(raw.status as TaskStatus) ? raw.status : "backlog",
    owner: VALID_OWNERS.includes(raw.owner as TaskOwner) ? raw.owner : "claude",
    category: VALID_CATEGORIES.includes(raw.category as TaskCategory) ? raw.category : "one_tm",
    due_date: typeof raw.due_date === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw.due_date) ? raw.due_date : null,
    position: typeof raw.position === "number" ? raw.position : 0,
    source: typeof raw.source === "string" ? raw.source.trim() : null,
    source_date: typeof raw.source_date === "string" ? raw.source_date : null,
  };
}

// POST /api/tasks/bulk — import multiple tasks (admin only)
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!Array.isArray(body.tasks)) {
    return NextResponse.json({ error: "tasks array is required" }, { status: 400 });
  }

  if (body.tasks.length > 200) {
    return NextResponse.json({ error: "Maximum 200 tasks per import" }, { status: 400 });
  }

  const sanitized = body.tasks
    .map((t: RawTask) => sanitizeTask(t))
    .filter(Boolean);

  if (sanitized.length === 0) {
    return NextResponse.json({ error: "No valid tasks found" }, { status: 400 });
  }

  if (isLocalMode) {
    const created = bulkCreateTasks(sanitized);
    return NextResponse.json({ imported: created.length, tasks: created }, { status: 201 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tasks").insert(sanitized).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ imported: data?.length || 0, tasks: data }, { status: 201 });
}
