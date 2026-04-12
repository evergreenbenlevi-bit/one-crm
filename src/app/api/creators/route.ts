import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const active = searchParams.get("active");

  let query = supabase
    .from("creators")
    .select("*")
    .order("added_at", { ascending: false });

  if (active !== null) {
    query = query.eq("active", active === "true");
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await req.json();

  const { handle, platform, niche, display_name, profile_url, notes } = body;

  if (!handle || !platform) {
    return NextResponse.json({ error: "handle and platform required" }, { status: 400 });
  }
  if (!["youtube", "instagram"].includes(platform)) {
    return NextResponse.json({ error: "platform must be youtube or instagram" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creators")
    .insert({ handle, platform, niche: niche || "other", display_name, profile_url, notes })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const body = await req.json();
  const {
    id, display_name, niche, profile_url, notes, active,
    format_type, domain, thumbnail_url, youtube_channel_id,
    instagram_username, example_posts, vault_path, analysis_status,
  } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Whitelist — only allowed fields
  const updates = Object.fromEntries(
    Object.entries({
      display_name, niche, profile_url, notes, active,
      format_type, domain, thumbnail_url, youtube_channel_id,
      instagram_username, example_posts, vault_path, analysis_status,
    }).filter(([, v]) => v !== undefined)
  );

  const { data, error } = await supabase
    .from("creators")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // soft delete
  const { error } = await supabase
    .from("creators")
    .update({ active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
