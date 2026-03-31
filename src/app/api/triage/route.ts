import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { TaskLayer } from "@/lib/types/tasks";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

const VALID_LAYERS: TaskLayer[] = ["needle_mover", "project", "quick_win", "wishlist", "nice_to_have", "deleted"];

// PATCH /api/triage — bulk update layers
// Body: { updates: Array<{ id: string; layer: TaskLayer }> }
export async function PATCH(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates: { id: string; layer: TaskLayer }[] = body.updates ?? [];

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "updates array required" }, { status: 400 });
  }

  const invalid = updates.find((u) => !u.id || !VALID_LAYERS.includes(u.layer));
  if (invalid) {
    return NextResponse.json({ error: "Invalid update entry", entry: invalid }, { status: 400 });
  }

  const supabase = createAdminClient();
  const results = await Promise.allSettled(
    updates.map(({ id, layer }) =>
      supabase.from("tasks").update({ layer, updated_at: new Date().toISOString() }).eq("id", id)
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({ updated: updates.length - failed, failed });
}
