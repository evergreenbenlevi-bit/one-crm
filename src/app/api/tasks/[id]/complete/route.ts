import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
  return { id: user.id, role: (data?.role as "admin" | "user") || "user" };
}

/** Calculate next due date from recur_pattern */
function calcNextDate(pattern: string, from: Date = new Date()): Date {
  const next = new Date(from);

  if (pattern === "daily") {
    next.setDate(next.getDate() + 1);
    return next;
  }

  if (pattern.startsWith("weekly:")) {
    const targetDay = parseInt(pattern.split(":")[1], 10); // 0=Sun..6=Sat
    const current = next.getDay();
    const daysAhead = ((targetDay - current) + 7) % 7 || 7;
    next.setDate(next.getDate() + daysAhead);
    return next;
  }

  if (pattern.startsWith("monthly:")) {
    const targetDate = parseInt(pattern.split(":")[1], 10);
    next.setMonth(next.getMonth() + 1);
    next.setDate(Math.min(targetDate, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
    return next;
  }

  // fallback: +7 days
  next.setDate(next.getDate() + 7);
  return next;
}

// PATCH /api/tasks/[id]/complete
// Body: { completed: boolean }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (authUser.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const completed = Boolean(body.completed);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  // Fetch current task
  const { data: task, error: fetchErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !task) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Mark current task as done
  const { data: updated, error: updateErr } = await supabase
    .from("tasks")
    .update({
      status: completed ? "done" : "todo",
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Spawn next instance if recurring and completing (not un-completing)
  if (completed && task.is_recurring && task.recur_pattern) {
    const nextDate = calcNextDate(task.recur_pattern);
    const nextDueDate = nextDate.toISOString().split("T")[0];

    await supabase.from("tasks").insert([{
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: "todo",
      owner: task.owner,
      category: task.category,
      due_date: nextDueDate,
      tags: task.tags || [],
      source: task.source,
      depends_on: null,
      parent_id: task.parent_id,
      position: task.position,
      is_recurring: true,
      recur_pattern: task.recur_pattern,
      recur_next_at: nextDate.toISOString(),
    }]);
  }

  return NextResponse.json(updated);
}
