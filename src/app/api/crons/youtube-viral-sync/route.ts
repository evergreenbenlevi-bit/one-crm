/**
 * YouTube Viral Sync — weekly Sunday 07:00
 * Fetches top 20 videos by view count per creator via YouTube Data API v3.
 * Marks is_lifetime_top5 + is_7day_best, upserts to viral_scans.
 *
 * vercel.json cron: { "path": "/api/crons/youtube-viral-sync", "schedule": "0 7 * * 0" }
 */
import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1"];
export const maxDuration = 300;

import { createAdminClient } from "@/lib/supabase/admin";
import { getTopVideos, findChannelId } from "@/lib/youtube";

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

  // Fetch all active YouTube creators
  const { data: creators, error: fetchErr } = await supabase
    .from("creators")
    .select("id, handle, display_name, domain, youtube_channel_id, platform")
    .eq("active", true)
    .or("platform.eq.youtube,youtube_channel_id.not.is.null");

  if (fetchErr || !creators || creators.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: "No YouTube creators found" });
  }

  const results: Array<{ handle: string; status: string; videos?: number; error?: string }> = [];

  for (const creator of creators) {
    const niche = NICHE_MAP[creator.domain ?? "other"] ?? "other";

    try {
      let channelId = creator.youtube_channel_id;

      // Auto-discover channel ID if not set
      if (!channelId) {
        channelId = await findChannelId(creator.handle);
        if (channelId) {
          await supabase.from("creators").update({ youtube_channel_id: channelId }).eq("id", creator.id);
        }
      }

      if (!channelId) {
        results.push({ handle: creator.handle, status: "skip", error: "channel not found" });
        continue;
      }

      const videos = await getTopVideos(channelId, 20);

      if (videos.length === 0) {
        results.push({ handle: creator.handle, status: "empty" });
        continue;
      }

      // Top 5 by view count = lifetime top
      const lifetimeTopIds = new Set(
        [...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map((v) => v.url)
      );

      const rows = videos.map((video) => {
        const isLifetimeTop5 = lifetimeTopIds.has(video.url);
        const is7dayBest = video.publishedAt ? new Date(video.publishedAt) >= sevenDaysAgo : false;
        const score = viralScore(video.viewCount, video.likeCount, video.commentCount);

        return {
          week,
          niche,
          platform: "youtube" as const,
          post_url: video.url,
          creator_handle: creator.handle,
          title: video.title.slice(0, 200),
          hook_text: video.title.slice(0, 200),
          views: video.viewCount,
          likes: video.likeCount,
          comments: video.commentCount,
          engagement_ratio: video.viewCount > 0 ? (video.likeCount + video.commentCount) / video.viewCount : null,
          viral_score: score,
          thumbnail_url: video.thumbnailUrl || null,
          format_type: "long_form" as const,
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
        results.push({ handle: creator.handle, status: "error", error: upsertErr.message });
        continue;
      }

      await supabase
        .from("creators")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", creator.id);

      results.push({ handle: creator.handle, status: "ok", videos: videos.length });
    } catch (err) {
      results.push({
        handle: creator.handle,
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
