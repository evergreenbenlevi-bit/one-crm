/**
 * ScrapeCreators client — Instagram Reels via /v1/instagram/user/reels
 * 1 credit per call. Returns play_count + video_versions[0].url per reel.
 *
 * Setup: SCRAPE_CREATORS_API_KEY in .env.local
 * Docs: https://scrapecreators.com
 */

const SC_KEY = process.env.SCRAPE_CREATORS_API_KEY;
const BASE = "https://api.scrapecreators.com/v1";

export interface SCReel {
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

function extractVideoUrl(raw: Raw): string | null {
  // ScrapeCreators returns video_versions as array; first entry is highest quality
  const versions = raw["video_versions"];
  if (Array.isArray(versions) && versions.length > 0) {
    const first = versions[0] as Raw;
    const u = str(first, "url");
    if (u) return u;
  }
  // Fallbacks for any response shape variation
  return str(raw, "video_url", "videoUrl", "video_download_url", "download_url") || null;
}

function mapReel(raw: Raw, username: string): SCReel {
  const code =
    str(raw, "code", "shortcode", "short_code", "id") ||
    str(raw, "url", "post_url", "permalink").match(/\/(?:reel|p)\/([A-Za-z0-9_-]+)/)?.[1] ||
    "";

  const postUrl =
    str(raw, "url", "post_url", "permalink", "link") ||
    (code ? `https://www.instagram.com/reel/${code}/` : `https://www.instagram.com/${username}/`);

  return {
    shortCode: code,
    url: postUrl,
    ownerUsername: str(raw, "username", "owner_username", "ownerUsername") || username,
    videoViewCount: num(raw, "play_count", "video_view_count", "views_count", "views", "viewCount"),
    likesCount: num(raw, "like_count", "likes_count", "likes", "likeCount"),
    commentsCount: num(raw, "comment_count", "comments_count", "comments", "commentCount"),
    caption: str(raw, "caption", "description", "text", "content"),
    timestamp: str(raw, "taken_at_ts", "timestamp", "created_at", "published_at", "taken_at"),
    thumbnailUrl: str(raw, "thumbnail_url", "thumbnailUrl", "display_url", "image_url", "cover") || null,
    videoUrl: extractVideoUrl(raw),
  };
}

export interface SCProfile {
  username: string;
  followersCount: number;
  profilePicUrl: string;
}

/**
 * Fetch Instagram profiles for a list of usernames via ScrapeCreators.
 * GET /v1/instagram/profile?handle={username} — 1 credit per call.
 * Errors per-profile are swallowed (skip + warn); never throws.
 */
export async function getInstagramProfiles(usernames: string[]): Promise<SCProfile[]> {
  if (!SC_KEY) throw new Error("SCRAPE_CREATORS_API_KEY not set");
  if (usernames.length === 0) return [];

  const results: SCProfile[] = [];

  await Promise.all(
    usernames.map(async (rawHandle) => {
      const handle = rawHandle.replace("@", "");
      try {
        const res = await fetch(
          `${BASE}/instagram/profile?handle=${encodeURIComponent(handle)}`,
          {
            headers: { "x-api-key": SC_KEY! },
            cache: "no-store",
          }
        );

        if (!res.ok) {
          console.warn(`[scrape-creators] profile @${handle} → HTTP ${res.status}`);
          return;
        }

        const data = (await res.json()) as Raw;

        const username =
          str(data, "username", "handle") || handle;
        const followersCount =
          num(data, "followersCount", "followers_count", "followers", "edge_followed_by_count");
        const profilePicUrl =
          str(data, "profilePicUrl", "profile_pic_url", "profile_picture", "avatar") || "";

        results.push({ username, followersCount, profilePicUrl });
      } catch (err) {
        console.warn(`[scrape-creators] profile @${handle} error:`, err);
      }
    })
  );

  return results;
}

export async function getTopReelsSC(
  username: string,
  limit = 20
): Promise<SCReel[]> {
  if (!SC_KEY) throw new Error("SCRAPE_CREATORS_API_KEY not set");

  const clean = username.replace("@", "");
  const url = `${BASE}/instagram/user/reels?username=${encodeURIComponent(clean)}&count=${limit}`;

  const res = await fetch(url, {
    headers: {
      "x-api-key": SC_KEY,
      "Content-Type": "application/json",
    },
    // Vercel functions: no cache, always fresh
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScrapeCreators GET reels for @${clean} → ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as unknown;

  // Normalize: ScrapeCreators may return { data: [...] } or [...] directly
  let items: Raw[];
  if (Array.isArray(data)) {
    items = data as Raw[];
  } else if (data && typeof data === "object") {
    const d = data as Raw;
    const candidate = d["data"] ?? d["reels"] ?? d["items"] ?? d["results"];
    items = Array.isArray(candidate) ? (candidate as Raw[]) : [];
  } else {
    items = [];
  }

  if (items.length === 0) {
    console.warn(`[scrape-creators] 0 reels returned for @${clean} — private/rate-limited?`);
    return [];
  }

  return items
    .map((r) => mapReel(r, clean))
    .sort((a, b) => b.videoViewCount - a.videoViewCount)
    .slice(0, limit);
}
