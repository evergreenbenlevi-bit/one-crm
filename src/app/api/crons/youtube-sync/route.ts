/**
 * YouTube Sync Cron — runs weekly via Vercel cron (Sunday 08:00)
 * Fetches stats for all active creators with youtube_channel_id
 * and upserts into creator_snapshots + updates creators.follower_count etc.
 *
 * vercel.json cron: { "path": "/api/crons/youtube-sync", "schedule": "0 6 * * 0" }
 */
import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1"];
export const maxDuration = 300;

import { createAdminClient } from "@/lib/supabase/admin";
import { getCreatorSnapshot, findChannelId } from "@/lib/youtube";
import { withCronNotify } from "@/lib/cron-notify";

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
  // Auth: verify cron secret (or Vercel's internal header)
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const week = getWeekLabel();

  // 1. Fetch all active creators with youtube_channel_id or YouTube platform
  const { data: creators, error: fetchErr } = await supabase
    .from("creators")
    .select("id, handle, display_name, platform, youtube_channel_id")
    .eq("active", true)
    .or("platform.eq.youtube,youtube_channel_id.not.is.null");

  if (fetchErr || !creators || creators.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: "No YouTube creators found" });
  }

  const results: Array<{ handle: string; status: string; error?: string }> = [];

  for (const creator of creators) {
    try {
      let channelId = creator.youtube_channel_id;

      // Auto-discover channel ID if not set
      if (!channelId) {
        channelId = await findChannelId(creator.handle);
        if (channelId) {
          await supabase
            .from("creators")
            .update({ youtube_channel_id: channelId })
            .eq("id", creator.id);
        }
      }

      if (!channelId) {
        results.push({ handle: creator.handle, status: "skip", error: "channel not found" });
        continue;
      }

      const snapshot = await getCreatorSnapshot(channelId);
      if (!snapshot) {
        results.push({ handle: creator.handle, status: "skip", error: "snapshot fetch failed" });
        continue;
      }

      const { channel, topVideo, avgViews } = snapshot;

      // Upsert snapshot
      await supabase.from("creator_snapshots").upsert(
        {
          creator_id: creator.id,
          week,
          followers: channel.subscriberCount,
          avg_views: avgViews,
          top_thumbnail_url: topVideo?.thumbnailUrl || null,
          top_video_url: topVideo?.url || null,
          top_video_title: topVideo?.title || null,
          top_video_views: topVideo?.viewCount || null,
          top_posts: snapshot.recentVideos.slice(0, 5).map((v) => ({
            url: v.url,
            title: v.title,
            views: v.viewCount,
            thumbnail_url: v.thumbnailUrl,
            published_at: v.publishedAt,
          })),
          engagement_ratio:
            snapshot.recentVideos.length > 0
              ? snapshot.recentVideos.reduce((s, v) => s + (v.likeCount + v.commentCount), 0) /
                snapshot.recentVideos.reduce((s, v) => s + Math.max(v.viewCount, 1), 0)
              : 0,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "creator_id,week" }
      );

      // Denormalize latest metrics to creators table (fast lookups in UI)
      await supabase
        .from("creators")
        .update({
          follower_count: channel.subscriberCount,
          avg_views: avgViews,
          thumbnail_url: channel.thumbnailUrl || undefined,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", creator.id);

      results.push({ handle: creator.handle, status: "ok" });
    } catch (err) {
      results.push({
        handle: creator.handle,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Rate limiting: 1 req/sec to stay well under quota
    await new Promise((r) => setTimeout(r, 1000));
  }

  const synced = results.filter((r) => r.status === "ok").length;
  console.log(`YouTube sync complete: ${synced}/${creators.length} creators updated`);

  return NextResponse.json({ ok: true, week, synced, total: creators.length, results });
}

// GET endpoint for manual trigger from dashboard
export const GET = withCronNotify("youtube-sync", (req) => POST(req));

function getWeekLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}
