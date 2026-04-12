/**
 * Ben's YouTube Sync Cron — runs weekly Sunday 12:00 UTC
 * Fetches Ben's own YouTube channel videos and upserts into ben_performance_snapshots.
 *
 * Requires: BEN_YOUTUBE_CHANNEL_ID in .env.local
 * vercel.json cron: { "path": "/api/crons/ben-youtube-sync", "schedule": "0 12 * * 0" }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecentVideos } from "@/lib/youtube";

export const preferredRegion = ["fra1"];
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;

function getWeekLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const channelId = process.env.BEN_YOUTUBE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({
      ok: false,
      error: "BEN_YOUTUBE_CHANNEL_ID not configured — add to .env.local",
    });
  }

  let videos;
  try {
    videos = await getRecentVideos(channelId, 10);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  if (!videos || videos.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: "No videos found for channel" });
  }

  const supabase = createAdminClient();
  const week = getWeekLabel();
  const results: Array<{ videoId: string; status: string; error?: string }> = [];

  for (const video of videos) {
    try {
      const publishDate = video.publishedAt ? video.publishedAt.split("T")[0] : null;

      await supabase.from("ben_performance_snapshots").upsert(
        {
          platform: "youtube",
          week,
          video_id: video.videoId,
          post_url: video.url,
          title: video.title,
          thumbnail_url: video.thumbnailUrl,
          views: video.viewCount,
          likes: video.likeCount,
          comments: video.commentCount,
          shares: 0,
          reach: video.viewCount,
          publish_date: publishDate,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "platform,video_id,week" }
      );

      results.push({ videoId: video.videoId, status: "ok" });
    } catch (err) {
      results.push({
        videoId: video.videoId,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const synced = results.filter((r) => r.status === "ok").length;
  console.log(`Ben YouTube sync: ${synced}/${videos.length} videos upserted`);

  return NextResponse.json({ ok: true, week, synced, total: videos.length, results });
}

// GET for manual trigger from dashboard
export async function GET(req: NextRequest) {
  return POST(req);
}
