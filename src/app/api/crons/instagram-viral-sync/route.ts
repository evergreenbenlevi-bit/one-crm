/**
 * Instagram Viral Sync — ScrapeCreators edition
 * Weekly Sunday 09:00 (vercel.json cron).
 *
 * Per creator:
 *   - Fetches reels via ScrapeCreators /v1/instagram/user/reels (1 credit/call)
 *   - Takes top 3 by play_count
 *   - Downloads video to Supabase Storage at ingest time (CDN URLs expire)
 *   - Upserts rows to viral_scans (same schema as before)
 *
 * ENV: SCRAPE_CREATORS_API_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
 * FLAG: Supabase bucket "viral-videos" must exist (public or private).
 *       Create via Supabase dashboard → Storage → New bucket → "viral-videos".
 */
import { NextRequest, NextResponse } from "next/server";

export const preferredRegion = ["fra1"];
export const maxDuration = 300;

import { createAdminClient } from "@/lib/supabase/admin";
import { getTopReelsSC, SCReel } from "@/lib/scrape-creators";
import { transcribeVideo } from "@/lib/assemblyai";
import { withCronNotify } from "@/lib/cron-notify";

const CRON_SECRET = process.env.CRON_SECRET;

// Supabase Storage bucket for downloaded videos
const VIDEO_BUCKET = "viral-videos";

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

function cleanText(s: string): string {
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

function getWeekLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Download video from CDN URL and upload to Supabase Storage.
 * Returns permanent public URL, or null if download/upload fails.
 */
async function downloadAndStore(
  videoUrl: string,
  storagePath: string
): Promise<string | null> {
  const supabase = createAdminClient();
  try {
    const res = await fetch(videoUrl, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`[viral-sync] video fetch failed: ${res.status} for ${videoUrl.slice(0, 80)}`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "video/mp4";
    const buffer = await res.arrayBuffer();
    const { error } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(storagePath, buffer, { contentType, upsert: true });
    if (error) {
      console.warn(`[viral-sync] storage upload failed for ${storagePath}: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(storagePath);
    return data?.publicUrl ?? null;
  } catch (err) {
    console.warn(`[viral-sync] downloadAndStore exception: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

type Creator = {
  id: string;
  handle: string;
  display_name: string;
  domain: string | null;
  instagram_username: string | null;
  platform: string;
};

async function syncCreator(creator: Creator, week: string, sevenDaysAgo: Date) {
  const supabase = createAdminClient();
  const username = (creator.instagram_username || creator.handle).replace("@", "");
  const niche = NICHE_MAP[creator.domain ?? "other"] ?? "other";

  try {
    // Fetch reels sorted by play_count desc
    const reels = await getTopReelsSC(username, 20);

    if (reels.length === 0) {
      return { handle: username, status: "empty" };
    }

    // Top 3 by play_count
    const top3 = reels.slice(0, 3);

    const lifetimeTopIds = new Set(
      [...reels].sort((a, b) => b.videoViewCount - a.videoViewCount).slice(0, 5).map((r) => r.shortCode)
    );

    const rows = await Promise.all(
      top3.map(async (reel: SCReel, idx: number) => {
        const isLifetimeTop5 = lifetimeTopIds.has(reel.shortCode);
        const is7dayBest = reel.timestamp ? new Date(reel.timestamp) >= sevenDaysAgo : false;
        const score = viralScore(reel.videoViewCount, reel.likesCount, reel.commentsCount);

        // Download video to Supabase Storage (CDN URLs expire)
        let storedVideoUrl: string | null = null;
        if (reel.videoUrl) {
          const safeCode = reel.shortCode || `${username}-${week}-${idx}`;
          storedVideoUrl = await downloadAndStore(reel.videoUrl, `instagram/${username}/${safeCode}.mp4`);
        }

        // Transcribe top reel only
        const transcript =
          idx === 0 && reel.videoUrl ? await transcribeVideo(reel.videoUrl) : null;

        return {
          week,
          niche,
          platform: "instagram" as const,
          post_url: reel.url,
          creator_handle: username,
          title: cleanText(reel.caption).slice(0, 150) || null,
          hook_text: cleanText(reel.caption).slice(0, 200) || null,
          views: reel.videoViewCount,
          likes: reel.likesCount,
          comments: reel.commentsCount,
          engagement_ratio:
            reel.videoViewCount > 0
              ? (reel.likesCount + reel.commentsCount) / reel.videoViewCount
              : null,
          viral_score: score,
          thumbnail_url: reel.thumbnailUrl,
          // stored permanent URL preferred; falls back to original CDN URL
          video_url: storedVideoUrl ?? reel.videoUrl ?? null,
          transcript,
          format_type: "short_form" as const,
          is_lifetime_top5: isLifetimeTop5,
          is_7day_best: is7dayBest,
          captured_at: new Date().toISOString(),
        };
      })
    );

    let skipped = 0;
    for (const row of rows) {
      const { error: rowErr } = await supabase
        .from("viral_scans")
        .upsert([row], { onConflict: "post_url", ignoreDuplicates: false });
      if (rowErr) {
        console.warn(`[viral-sync] upsert error for ${row.post_url}: ${rowErr.message}`);
        skipped++;
      }
    }

    if (skipped === rows.length) {
      return { handle: username, status: "error", error: `all ${skipped} rows failed upsert` };
    }

    await supabase
      .from("creators")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", creator.id);

    return { handle: username, status: "ok", reels: top3.length, skipped };
  } catch (err) {
    return {
      handle: username,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const week = getWeekLabel();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: creators, error: fetchErr } = await supabase
    .from("creators")
    .select("id, handle, display_name, domain, instagram_username, platform")
    .eq("active", true)
    .or("platform.eq.instagram,instagram_username.not.is.null");

  if (fetchErr || !creators || creators.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, message: "No Instagram creators found" });
  }

  const settled = await Promise.allSettled(
    creators.map((c) => syncCreator(c as Creator, week, sevenDaysAgo))
  );

  const results = settled.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { handle: "unknown", status: "error", error: String(r.reason) }
  );

  const synced = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({
    ok: true,
    week,
    provider: "scrape-creators",
    topN: 3,
    synced,
    total: creators.length,
    results,
  });
}

export const GET = withCronNotify("instagram-viral-sync", (req) => POST(req));
