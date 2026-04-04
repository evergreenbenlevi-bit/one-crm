import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { EstimatedMinutes } from "@/lib/types/tasks";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VALID_MINUTES: EstimatedMinutes[] = [5, 15, 30, 45, 60, 90, 120];

/**
 * POST /api/tasks/schedule
 * Schedule a task: update task status + create calendar_queue entry
 * Body: { task_id, date, start_time?, duration_minutes }
 */
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { task_id, date, start_time, duration_minutes } = body;

  if (!task_id || typeof task_id !== "string") {
    return NextResponse.json({ error: "task_id required" }, { status: 400 });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (start_time && !/^\d{2}:\d{2}$/.test(start_time)) {
    return NextResponse.json({ error: "start_time must be HH:MM" }, { status: 400 });
  }
  const mins = duration_minutes || 30;
  if (!VALID_MINUTES.includes(mins as EstimatedMinutes)) {
    return NextResponse.json({ error: `duration_minutes must be one of: ${VALID_MINUTES.join(", ")}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get task title
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("id, title, parent_id")
    .eq("id", task_id)
    .single();

  if (taskErr || !task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Update task: set scheduled status + due_date + estimated_minutes
  await supabase.from("tasks").update({
    status: "scheduled",
    due_date: date,
    estimated_minutes: mins,
  }).eq("id", task_id);

  // Cancel any existing pending queue entries for this task
  await supabase.from("calendar_queue")
    .update({ status: "cancelled" })
    .eq("task_id", task_id)
    .eq("status", "pending");

  // Create calendar queue entry
  const { data: queueEntry, error: queueErr } = await supabase
    .from("calendar_queue")
    .insert({
      task_id,
      title: task.title,
      date,
      start_time: start_time || null,
      duration_minutes: mins,
    })
    .select()
    .single();

  if (queueErr) {
    return NextResponse.json({ error: queueErr.message }, { status: 500 });
  }

  return NextResponse.json({
    scheduled: true,
    queue_id: queueEntry.id,
    task_id,
    date,
    duration_minutes: mins,
  });
}
