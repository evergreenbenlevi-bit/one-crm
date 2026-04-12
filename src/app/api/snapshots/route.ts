import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1", "arn1", "cdg1"];

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const authUser = await requireAuth(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(req.url);
  const creator_id = searchParams.get("creator_id");
  const week = searchParams.get("week");
  const limit = parseInt(searchParams.get("limit") || "10");

  // latest snapshot per creator
  if (!creator_id && !week) {
    const { data, error } = await supabase
      .from("creator_snapshots")
      .select(`
        *,
        creators (
          id, handle, platform, niche, display_name, profile_url, active,
          domain, format_type, thumbnail_url, analysis_status,
          follower_count, avg_views, example_posts, vault_path, instagram_username
        )
      `)
      .order("captured_at", { ascending: false })
      .limit(1000); // safe for hundreds of creators × weeks

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // deduplicate: keep latest per creator_id
    const seen = new Set<string>();
    const latest = data?.filter((row) => {
      if (seen.has(row.creator_id)) return false;
      seen.add(row.creator_id);
      return true;
    });

    return NextResponse.json(latest);
  }

  let query = supabase
    .from("creator_snapshots")
    .select(`*, creators(id, handle, platform, niche, display_name, profile_url, domain, format_type, thumbnail_url, analysis_status, follower_count, avg_views, example_posts, vault_path, instagram_username)`)
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (creator_id) query = query.eq("creator_id", creator_id);
  if (week) query = query.eq("week", week);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
