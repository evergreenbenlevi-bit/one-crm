/**
 * lobstr.io client — Instagram Reels scraper
 * Drop-in replacement for apify.ts getTopReels().
 *
 * Setup (one-time):
 *   1. Register at lobstr.io → get API key → LOBSTR_API_KEY in .env.local
 *   2. GET https://api.lobstr.io/v1/crawlers → find Instagram Reels slug → LOBSTR_INSTAGRAM_CRAWLER_ID
 *
 * Workflow per call: create squid → add task → start run → poll → get results
 * Timeout: 240s (matches Apify's timeout budget inside maxDuration=300 route)
 */

const LOBSTR_KEY = process.env.LOBSTR_API_KEY;
const BASE = "https://api.lobstr.io/v1";

// Discover via GET /v1/crawlers — look for slug containing "instagram" + "reel"
const CRAWLER_ID = process.env.LOBSTR_INSTAGRAM_CRAWLER_ID ?? "";

export interface IGReel {
  shortCode: string;
  url: string;
  ownerUsername: string;
  videoViewCount: number;
  likesCount: number;
  commentsCount: number;
  caption: string;
  timestamp: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
}

type Raw = Record<string, unknown>;

function num(obj: Raw, ...keys: string[]): number {
  for (const k of keys) {
    if (typeof obj[k] === "number") return obj[k] as number;
    if (typeof obj[k] === "string" && !isNaN(Number(obj[k]))) return Number(obj[k]);
  }
  return 0;
}

function str(obj: Raw, ...keys: string[]): string {
  for (const k of keys) {
    if (typeof obj[k] === "string" && obj[k]) return obj[k] as string;
  }
  return "";
}

async function apiCall(path: string, method = "GET", body?: object): Promise<unknown> {
  if (!LOBSTR_KEY) throw new Error("LOBSTR_API_KEY not set");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Token ${LOBSTR_KEY}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`lobstr.io ${method} ${path} → ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mapReel(raw: Raw, username: string): IGReel {
  const postUrl = str(raw, "reel_url", "url", "post_url", "permalink", "shortUrl", "link");
  const shortCodeMatch = postUrl.match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
  return {
    shortCode:
      str(raw, "shortcode", "short_code", "id", "post_id") ||
      shortCodeMatch?.[1] ||
      "",
    url: postUrl || `https://www.instagram.com/${username}/`,
    ownerUsername:
      str(raw, "username", "owner_username", "ownerUsername", "author") ||
      username,
    videoViewCount: num(
      raw,
      "views_count",
      "video_view_count",
      "views",
      "plays",
      "play_count",
      "viewCount",
      "view_count"
    ),
    likesCount: num(
      raw,
      "likes_count",
      "likes",
      "like_count",
      "likeCount",
      "digg_count"
    ),
    commentsCount: num(
      raw,
      "comments_count",
      "comments",
      "comment_count",
      "commentCount"
    ),
    caption: str(raw, "caption", "description", "text", "content"),
    timestamp: str(
      raw,
      "timestamp",
      "created_at",
      "published_at",
      "date",
      "taken_at",
      "postedAt"
    ),
    thumbnailUrl:
      str(
        raw,
        "thumbnail_url",
        "thumbnailUrl",
        "display_url",
        "image_url",
        "cover"
      ) || null,
    videoUrl:
      str(
        raw,
        "video_url",
        "videoUrl",
        "download_url",
        "video_download_url",
        "videoDownloadUrl"
      ) || null,
  };
}

export async function getTopReels(
  username: string,
  limit = 20
): Promise<IGReel[]> {
  if (!LOBSTR_KEY) throw new Error("LOBSTR_API_KEY not set");
  if (!CRAWLER_ID)
    throw new Error(
      "LOBSTR_INSTAGRAM_CRAWLER_ID not set — GET /v1/crawlers to find the slug"
    );

  // 1. Create squid
  const squid = (await apiCall("/squids", "POST", {
    crawler: CRAWLER_ID,
    name: `ig-reels-${username}-${Date.now()}`,
  })) as { id: string };

  // 2. Update squid params — max_results lives on the squid, NOT the task.
  //    Without this, squid stays `is_ready: false` and /runs fails with SquidNotReady.
  await apiCall(`/squids/${squid.id}`, "POST", {
    params: { max_results: limit },
  });

  // 3. Add task (Instagram profile URL) — endpoint is /v1/tasks, NOT /v1/squids/{id}/tasks
  await apiCall(`/tasks`, "POST", {
    squid: squid.id,
    tasks: [{ url: `https://www.instagram.com/${username}/` }],
  });

  // 4. Start run
  const run = (await apiCall("/runs", "POST", { squid: squid.id })) as {
    id: string;
  };

  // 4. Poll until done (max 240s at 5s intervals)
  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const status = (await apiCall(`/runs/${run.id}`)) as {
      status?: string;
      state?: string;
      finished?: boolean;
    };
    const s = (status.status || status.state || "").toLowerCase();
    if (
      s === "done" ||
      s === "completed" ||
      s === "finished" ||
      status.finished === true
    )
      break;
    if (s === "failed" || s === "error")
      throw new Error(`lobstr.io run ${run.id} failed`);
  }

  // 5. Fetch results (paginate up to limit)
  const allItems: Raw[] = [];
  let page = 1;
  while (allItems.length < limit) {
    const res = (await apiCall(
      `/results?run=${run.id}&page=${page}&page_size=100`
    )) as { results?: Raw[]; data?: Raw[]; next?: string | null } | Raw[];
    const items = Array.isArray(res)
      ? res
      : ((res.results ?? res.data ?? []) as Raw[]);
    if (!items.length) break;
    allItems.push(...items);
    const hasMore = !Array.isArray(res) && !!res.next;
    if (!hasMore) break;
    page++;
  }

  if (allItems.length === 0) {
    console.warn(
      `[lobstr] 0 reels returned for @${username} — private or rate-limited?`
    );
    return [];
  }

  return allItems
    .map((r) => mapReel(r, username))
    .sort((a, b) => b.videoViewCount - a.videoViewCount)
    .slice(0, limit);
}
