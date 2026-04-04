import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const preferredRegion = ["fra1", "arn1", "cdg1"];
export const maxDuration = 60;

// POST /api/triage/process-batch
// Called by cron 3x/day — processes all tasks with triage_action set
// Auth: requires X-Batch-Secret header matching env var
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-batch-secret");
  if (secret !== process.env.TRIAGE_BATCH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch all tasks with pending triage actions
  const { data: pending, error } = await supabase
    .from("tasks")
    .select("*")
    .not("triage_action", "is", null)
    .not("status", "eq", "done")
    .not("status", "eq", "archived")
    .order("triaged_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ processed: 0, message: "No pending triage items" });
  }

  const results: { id: string; title: string; action: string; result: string }[] = [];

  for (const task of pending) {
    const action = task.triage_action;
    const updates: Record<string, unknown> = {
      triage_action: null, // Clear after processing
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case "claude":
        updates.owner = "claude";
        updates.status = "todo";
        break;

      case "ben":
        updates.owner = "ben";
        updates.status = "todo";
        break;

      case "confirm":
        // Task is fine as-is, just clear triage flag
        break;

      case "skip":
        // Move to end of queue, keep in inbox
        updates.status = "inbox";
        break;

      case "delete":
        updates.status = "archived";
        updates.archived_at = new Date().toISOString();
        updates.archive_reason = "deleted_via_triage";
        break;

      default:
        // Unknown action — log and skip
        results.push({ id: task.id, title: task.title, action: action || "null", result: "unknown_action" });
        continue;
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", task.id);

    // Log activity
    await supabase.from("task_activity").insert({
      task_id: task.id,
      activity_type: "triage_batch",
      actor: "system",
      field_name: "triage_action",
      old_value: action,
      new_value: updates.status ? String(updates.status) : "confirmed",
    });

    results.push({
      id: task.id,
      title: task.title,
      action: action || "null",
      result: updateError ? `error: ${updateError.message}` : "processed",
    });
  }

  // Collect triage_notes for post-processing
  const notesForProcessing = pending
    .filter((t) => t.triage_notes && t.triage_notes.trim())
    .map((t) => ({
      task_id: t.id,
      title: t.title,
      action: t.triage_action,
      notes: t.triage_notes,
      category: t.category,
    }));

  return NextResponse.json({
    processed: results.length,
    results,
    notes_collected: notesForProcessing.length,
    notes: notesForProcessing,
    timestamp: new Date().toISOString(),
  });
}
