import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/tasks/[taskId]/activity — fetch activity log for a task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_activity")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tasks/[taskId]/activity — add a note/comment to a task
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { taskId } = await params;
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });

  const body = await request.json();
  const content = body?.content?.trim();
  const actor = body?.actor || "ben";

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  if (content.length > 5000) {
    return NextResponse.json({ error: "content too long (max 5000)" }, { status: 400 });
  }

  if (!["ben", "claude", "system"].includes(actor)) {
    return NextResponse.json({ error: "actor must be ben, claude, or system" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("task_activity")
    .insert({
      task_id: taskId,
      activity_type: "note",
      actor,
      content,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
