import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

// PATCH /api/actions — update ben_action on a viral_scan, optionally create repurpose task
export async function PATCH(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await req.json();
  const { id, action } = body;

  if (!id || !action) return NextResponse.json({ error: "id and action required" }, { status: 400 });
  if (!["none", "saved", "repurpose", "dismiss"].includes(action)) {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  // Fetch the viral scan to build task title
  const { data: scan, error: scanErr } = await supabase
    .from("viral_scans")
    .select("*")
    .eq("id", id)
    .single();

  if (scanErr || !scan) return NextResponse.json({ error: "scan not found" }, { status: 404 });

  let repurpose_task_id: string | null = null;

  if (action === "repurpose") {
    // Create a CRM task for repurpose
    const taskTitle = `Repurpose: ${scan.creator_handle || "creator"} — ${(scan.title || scan.hook_text || "viral post").slice(0, 80)}`;
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .insert({
        title: taskTitle,
        status: "inbox",
        impact: "needle_mover",
        size: "medium",
        notes: `Source: ${scan.post_url}\nHook: ${scan.hook_text || ""}\nViews: ${scan.views || 0} | Likes: ${scan.likes || 0}`,
      })
      .select("id")
      .single();

    if (taskErr) {
      console.error("Task creation failed:", taskErr.message);
      // Non-fatal — still update ben_action
    } else if (task) {
      repurpose_task_id = task.id;
    }
  }

  const updates: Record<string, unknown> = { ben_action: action };
  if (repurpose_task_id) updates.repurpose_task_id = repurpose_task_id;

  const { data, error } = await supabase
    .from("viral_scans")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, scan: data, repurpose_task_id });
}
