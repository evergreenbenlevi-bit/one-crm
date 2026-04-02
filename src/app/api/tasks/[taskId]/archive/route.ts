import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// POST /api/tasks/[taskId]/archive — archive a task with reason
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const body = await request.json();
  const reason = body?.reason?.trim() || "לא צוינה סיבה";

  const supabase = createAdminClient();

  // Archive the task
  const { data: task, error: updateError } = await supabase
    .from("tasks")
    .update({
      archived_at: new Date().toISOString(),
      archive_reason: reason,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Log activity
  await supabase.from("task_activity").insert({
    task_id: taskId,
    activity_type: "archived",
    actor: "ben",
    content: reason,
  });

  return NextResponse.json(task);
}

// DELETE /api/tasks/[taskId]/archive — unarchive (restore) a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: task, error: updateError } = await supabase
    .from("tasks")
    .update({
      archived_at: null,
      archive_reason: null,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Log activity
  await supabase.from("task_activity").insert({
    task_id: taskId,
    activity_type: "field_change",
    actor: "ben",
    content: "שוחזר מארכיון",
    field_name: "archived_at",
    old_value: "archived",
    new_value: "active",
  });

  return NextResponse.json(task);
}
