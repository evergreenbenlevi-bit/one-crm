import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";
import type { CreateFolderPayload } from "@/lib/types/areas";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

// POST /api/folders — create new folder under an area
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: CreateFolderPayload = await req.json();
  const { area_id, name, slug, icon, href, position } = body;

  if (!area_id?.trim() || !name?.trim() || !slug?.trim()) {
    return NextResponse.json({ error: "area_id, name, and slug are required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify area exists
  const { data: area, error: areaError } = await supabase
    .from("areas")
    .select("id")
    .eq("id", area_id)
    .single();

  if (areaError || !area) {
    return NextResponse.json({ error: "area not found" }, { status: 404 });
  }

  // Get max position within this area if not provided
  let insertPosition = position;
  if (insertPosition === undefined) {
    const { data: maxRow } = await supabase
      .from("folders")
      .select("position")
      .eq("area_id", area_id)
      .order("position", { ascending: false })
      .limit(1)
      .single();
    insertPosition = (maxRow?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("folders")
    .upsert(
      {
        area_id,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        icon: icon ?? null,
        href: href ?? null,
        position: insertPosition,
        is_active: true,
      },
      { onConflict: "area_id,slug" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
