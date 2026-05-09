import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { CreateAreaPayload, AreaWithFolders } from "@/lib/types/areas";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// GET /api/areas — fetch all active areas with nested folders (for sidebar)
export async function GET() {
  const supabase = createAdminClient();

  const { data: areas, error } = await supabase
    .from("areas")
    .select(`
      id, name, slug, icon, color, position, is_active, created_at,
      folders (
        id, area_id, name, slug, icon, position, href, is_active, created_at
      )
    `)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort folders within each area by position
  const result: AreaWithFolders[] = (areas ?? []).map((area) => ({
    ...area,
    folders: ((area.folders as AreaWithFolders["folders"]) ?? [])
      .filter((f) => f.is_active)
      .sort((a, b) => a.position - b.position),
  }));

  return NextResponse.json(result);
}

// POST /api/areas — create new area (admin only)
export async function POST(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateAreaPayload = await req.json();
  const { name, slug, icon, color, position } = body;

  if (!name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "name and slug are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get max position if not provided
  let insertPosition = position;
  if (insertPosition === undefined) {
    const { data: maxRow } = await supabase
      .from("areas")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .single();
    insertPosition = (maxRow?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("areas")
    .upsert(
      {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        icon: icon ?? null,
        color: color ?? "#6366f1",
        position: insertPosition,
        is_active: true,
      },
      { onConflict: "slug" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
