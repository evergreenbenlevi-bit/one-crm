/**
 * Apify client — Instagram scrapers
 * Profile scraper: apify/instagram-profile-scraper
 * Reel scraper: apify/instagram-reel-scraper (sorted by views, resultsLimit=300 for lifetime top)
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
const ACTOR_ID = "apify~instagram-profile-scraper";
const REEL_ACTOR_ID = "apify~instagram-reel-scraper";

export interface ApifyIGProfile {
  username: string;
  fullName: string | null;
  biography: string | null;
  followersCount: number | null;
  followsCount: number | null;
  postsCount: number | null;
  profilePicUrl: string | null;
  isVerified: boolean;
  url: string;
}

/**
 * Fetch Instagram profiles for a list of usernames via Apify.
 * Uses run-sync-get-dataset-items for simplicity (waits for result).
 * Timeout: 120s — sufficient for ≤20 profiles.
 */
export async function getInstagramProfiles(usernames: string[]): Promise<ApifyIGProfile[]> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not set");
  if (usernames.length === 0) return [];

  const url = `https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120&memory=256`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernames }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  return data.map((item: Record<string, unknown>) => ({
    username: String(item.username ?? ""),
    fullName: item.fullName ? String(item.fullName) : null,
    biography: item.biography ? String(item.biography) : null,
    followersCount: typeof item.followersCount === "number" ? item.followersCount : null,
    followsCount: typeof item.followsCount === "number" ? item.followsCount : null,
    postsCount: typeof item.postsCount === "number" ? item.postsCount : null,
    profilePicUrl: item.profilePicUrl ? String(item.profilePicUrl) : null,
    isVerified: Boolean(item.isVerified),
    url: item.url ? String(item.url) : `https://www.instagram.com/${item.username}/`,
  }));
}

export interface ApifyReel {
  shortCode: string;
  url: string;
  ownerUsername: string;
  videoViewCount: number;
  likesCount: number;
  commentsCount: number;
  caption: string;
  timestamp: string;
  thumbnailUrl: string | null;
}

/**
 * Fetch top reels by view count for a single username.
 * resultsLimit=300 to get lifetime viral (not just recent).
 * Lessons from mistakes.md: always check for {error} key in response.
 */
export async function getTopReels(username: string, limit = 300): Promise<ApifyReel[]> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not set");

  const url = `https://api.apify.com/v2/acts/${REEL_ACTOR_ID}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=240&memory=512`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: [username], resultsLimit: limit }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify reel scraper error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // Guard: Apify sometimes returns {error: "..."} instead of array
  if (!Array.isArray(data)) {
    if (data && typeof data === "object" && "error" in data) {
      throw new Error(`Apify returned error: ${String((data as Record<string, unknown>).error)}`);
    }
    return [];
  }

  // Guard: empty array with no items — warn but don't throw
  if (data.length === 0) {
    console.warn(`[apify] getTopReels: 0 reels returned for @${username} — rate-limited or private?`);
    return [];
  }

  return data
    .map((item: Record<string, unknown>) => ({
      shortCode: String(item.shortCode ?? item.id ?? ""),
      url: String(item.url ?? `https://www.instagram.com/reel/${item.shortCode}/`),
      ownerUsername: String(item.ownerUsername ?? username),
      videoViewCount: typeof item.videoViewCount === "number" ? item.videoViewCount
        : typeof item.playCount === "number" ? item.playCount : 0,
      likesCount: typeof item.likesCount === "number" ? item.likesCount : 0,
      commentsCount: typeof item.commentsCount === "number" ? item.commentsCount : 0,
      caption: String(item.caption ?? "").slice(0, 500),
      timestamp: String(item.timestamp ?? ""),
      thumbnailUrl: item.displayUrl ? String(item.displayUrl) : null,
    }))
    .sort((a, b) => b.videoViewCount - a.videoViewCount);
}
