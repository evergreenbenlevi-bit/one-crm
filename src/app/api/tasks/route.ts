import { NextRequest, NextResponse } from "next/server";
import { isLocalMode, getAllTasks, createTask, updateTask, deleteTask } from "@/lib/tasks-store";
import type { TaskStatus, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";

// GET /api/tasks
export async function GET(request: NextRequest) {
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

  // Supabase mode
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  let query = supabase.from("tasks").select("*");

  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const owner = searchParams.get("owner");
  const category = searchParams.get("category");

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (owner) query = query.eq("owner", owner);
  if (category) query = query.eq("category", category);

  const { data, error } = await query.order("position").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tasks
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (isLocalMode) {
    const task = createTask(body);
    return NextResponse.json(task, { status: 201 });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tasks").insert([body]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/tasks
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  if (isLocalMode) {
    const task = updateTask(id, updates);
    if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(task);
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/tasks
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id query param is required" }, { status: 400 });

  if (isLocalMode) {
    const ok = deleteTask(id);
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
