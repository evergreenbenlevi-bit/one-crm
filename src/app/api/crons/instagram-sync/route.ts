/**
 * Instagram Sync Cron — runs weekly Sunday 10:00 (after YouTube sync at 06:00)
 * Fetches follower counts + profile data for all active Instagram creators via Apify.
 * Updates creators.follower_count + creator_snapshots.
 *
 * vercel.json cron: { "path": "/api/crons/instagram-sync", "schedule": "0 10 * * 0" }
 */
import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1"];
export const maxDuration = 300;

import { createAdminClient } from "@/lib/supabase/admin";
import { getInstagramProfiles } from "@/lib/apify";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const week = getWeekLabel();

  // 1. Fetch all active creators with instagram_username or Instagram platform
  const { data: creators, error: fetchErr } = await supabase
    .from("creators")
    .select("id, handle, display_name, platform, instagram_username")
    .eq("active", true)
    .or("platform.eq.instagram,instagram_username.not.is.null");

  if (fetchErr || !creators || creators.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: "No Instagram creators found" });
  }

  // 2. Build username list (prefer instagram_username, fall back to handle)
  const usernameMap: Record<string, string> = {};
  for (const c of creators) {
    const username = (c.instagram_username || c.handle).replace("@", "");
    usernameMap[username] = c.id;
  }

  const usernames = Object.keys(usernameMap);

  let profiles;
  try {
    profiles = await getInstagramProfiles(usernames);
  } catch (err) {
    console.error("Apify fetch error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const results: Array<{ username: string; status: string; error?: string }> = [];

  for (const profile of profiles) {
    const creatorId = usernameMap[profile.username];
    if (!creatorId) {
      results.push({ username: profile.username, status: "skip", error: "no creator match" });
      continue;
    }

    try {
      // Upsert snapshot (Instagram doesn't have avg_views — null is fine)
      await supabase.from("creator_snapshots").upsert(
        {
          creator_id: creatorId,
          week,
          followers: profile.followersCount,
          avg_views: null, // Instagram profile scraper doesn't return view counts
          top_thumbnail_url: profile.profilePicUrl,
          top_video_url: null,
          top_video_title: null,
          top_video_views: null,
          top_posts: [],
          engagement_ratio: null,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,week" }
      );

      // Denormalize to creators table
      const updates: Record<string, unknown> = {
        last_synced_at: new Date().toISOString(),
      };
      if (profile.followersCount !== null) updates.follower_count = profile.followersCount;
      if (profile.profilePicUrl) updates.thumbnail_url = profile.profilePicUrl;
      updates.instagram_username = profile.username;

      await supabase.from("creators").update(updates).eq("id", creatorId);

      results.push({ username: profile.username, status: "ok" });
    } catch (err) {
      results.push({
        username: profile.username,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Handle creators that Apify returned no data for
  for (const username of usernames) {
    if (!results.find((r) => r.username === username)) {
      results.push({ username, status: "no_data" });
    }
  }

  const synced = results.filter((r) => r.status === "ok").length;
  console.log(`Instagram sync complete: ${synced}/${usernames.length} creators updated`);

  return NextResponse.json({ ok: true, week, synced, total: usernames.length, results });
}

// GET for manual trigger from dashboard
export async function GET(req: NextRequest) {
  return POST(req);
}

function getWeekLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}
