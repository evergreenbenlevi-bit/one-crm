import { NextRequest, NextResponse } from "next/server";

// Prefer EU regions (Frankfurt/Stockholm) — closer to Israel than default US East
export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

// ── GET /api/projects/[id] ──
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: project, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  // Include tasks belonging to this project
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", id)
    .is("archived_at", null)
    .order("priority_score", { ascending: false })
    .order("position");

  return NextResponse.json({ ...project, tasks: tasks ?? [] });
}

// ── PATCH /api/projects/[id] ──
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.category !== undefined) updates.category = body.category?.trim() || null;
  if (body.portfolio !== undefined) updates.portfolio = body.portfolio || null;
  if (body.owner !== undefined) updates.owner = body.owner;
  if (body.position !== undefined) updates.position = Number(body.position);
  if (body.deadline !== undefined) updates.deadline = body.deadline || null;
  if (body.estimated_minutes !== undefined) updates.estimated_minutes = typeof body.estimated_minutes === "number" ? body.estimated_minutes : null;
  if (body.actual_minutes !== undefined) updates.actual_minutes = typeof body.actual_minutes === "number" ? body.actual_minutes : null;
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string").slice(0, 20) : [];
  if (body.completed_at !== undefined) updates.completed_at = body.completed_at || null;
  if (body.archived_at !== undefined) updates.archived_at = body.archived_at || null;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("projects").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// ── DELETE /api/projects/[id] ──
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  // Detach tasks from project (ON DELETE SET NULL covers DB side, but be explicit)
  await supabase.from("tasks").update({ project_id: null }).eq("project_id", id);

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
