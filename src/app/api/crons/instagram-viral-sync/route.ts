/**
 * Instagram Viral Sync — weekly Sunday 09:00
 * Fetches LIFETIME top reels (resultsLimit=300) per creator via Apify.
 * Computes viral_score, marks is_lifetime_top5 + is_7day_best, upserts to viral_scans.
 *
 * vercel.json cron: { "path": "/api/crons/instagram-viral-sync", "schedule": "0 9 * * 0" }
 */
import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1"];
export const maxDuration = 300;

import { createAdminClient } from "@/lib/supabase/admin";
import { getTopReels } from "@/lib/apify";

const CRON_SECRET = process.env.CRON_SECRET;

const NICHE_MAP: Record<string, string> = {
  manifesto: "confessional",
  ai_tech: "ai_creator",
  business: "business_coach",
  personal: "other",
  production: "other",
  other: "other",
};

function viralScore(views: number, likes: number, comments: number): number {
  return views + likes * 2 + comments * 3;
}

function getWeekLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const week = getWeekLabel();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch all active Instagram creators
  const { data: creators, error: fetchErr } = await supabase
    .from("creators")
    .select("id, handle, display_name, domain, instagram_username, platform")
    .eq("active", true)
    .or("platform.eq.instagram,instagram_username.not.is.null");

  if (fetchErr || !creators || creators.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: "No Instagram creators found" });
  }

  const results: Array<{ handle: string; status: string; reels?: number; error?: string }> = [];

  for (const creator of creators) {
    const username = (creator.instagram_username || creator.handle).replace("@", "");
    const niche = NICHE_MAP[creator.domain ?? "other"] ?? "other";

    try {
      const reels = await getTopReels(username, 300);

      if (reels.length === 0) {
        results.push({ handle: username, status: "empty" });
        continue;
      }

      // Mark top 5 by views as lifetime top
      const lifetimeTopIds = new Set(
        [...reels].sort((a, b) => b.videoViewCount - a.videoViewCount).slice(0, 5).map((r) => r.shortCode)
      );

      // Upsert each reel
      const rows = reels.map((reel) => {
        const isLifetimeTop5 = lifetimeTopIds.has(reel.shortCode);
        const is7dayBest = reel.timestamp ? new Date(reel.timestamp) >= sevenDaysAgo : false;
        const score = viralScore(reel.videoViewCount, reel.likesCount, reel.commentsCount);

        return {
          week,
          niche,
          platform: "instagram" as const,
          post_url: reel.url,
          creator_handle: username,
          title: reel.caption.slice(0, 150) || null,
          hook_text: reel.caption.slice(0, 200) || null,
          views: reel.videoViewCount,
          likes: reel.likesCount,
          comments: reel.commentsCount,
          engagement_ratio: reel.videoViewCount > 0 ? (reel.likesCount + reel.commentsCount) / reel.videoViewCount : null,
          viral_score: score,
          thumbnail_url: reel.thumbnailUrl,
          format_type: "short_form" as const,
          is_lifetime_top5: isLifetimeTop5,
          is_7day_best: is7dayBest,
          captured_at: new Date().toISOString(),
        };
      });

      const { error: upsertErr } = await supabase
        .from("viral_scans")
        .upsert(rows, {
          onConflict: "post_url",
          ignoreDuplicates: false,
        });

      if (upsertErr) {
        results.push({ handle: username, status: "error", error: upsertErr.message });
        continue;
      }

      // Update creator last_synced_at
      await supabase
        .from("creators")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", creator.id);

      results.push({ handle: username, status: "ok", reels: reels.length });
    } catch (err) {
      results.push({
        handle: username,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const synced = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({ ok: true, week, synced, total: creators.length, results });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
