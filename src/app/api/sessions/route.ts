import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/sessions — list active/stale sessions
export async function GET(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Auto-mark stale sessions (no heartbeat for 10 min)
  await supabase.rpc("mark_stale_sessions");

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "active";

  const { data, error } = await supabase
    .from("active_sessions")
    .select("*, tasks(id, title, status)")
    .eq("status", status)
    .order("started_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/sessions — check in (start session)
// Body: { session_name: string, task_id?: string, metadata?: object }
export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { session_name, task_id, metadata } = body;

  if (!session_name || typeof session_name !== "string") {
    return NextResponse.json({ error: "session_name required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check for collision: is another active session working on this task?
  if (task_id) {
    const { data: existing } = await supabase
      .from("active_sessions")
      .select("id, session_name")
      .eq("task_id", task_id)
      .eq("status", "active")
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        error: "collision",
        message: `Task already claimed by session: ${existing[0].session_name}`,
        conflicting_session: existing[0],
      }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from("active_sessions")
    .insert([{
      session_name,
      task_id: task_id || null,
      metadata: metadata || {},
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/sessions — heartbeat or update session
// Body: { id: string, task_id?: string, metadata?: object }
export async function PATCH(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = createAdminClient();
  const updateData: Record<string, unknown> = { last_heartbeat: new Date().toISOString() };

  if (updates.task_id !== undefined) updateData.task_id = updates.task_id;
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await supabase
    .from("active_sessions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/sessions?id=xxx — check out (close session)
export async function DELETE(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id query param required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("active_sessions")
    .update({ status: "closed" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
