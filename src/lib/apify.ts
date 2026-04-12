/**
 * Apify client — Instagram Profile Scraper
 * Actor: apify/instagram-profile-scraper
 * Returns: followers, posts count, profile pic, bio per username
 */

const APIFY_TOKEN = process.env.APIFY_API_TOKEN || process.env.APIFY_API_KEY;
const ACTOR_ID = "apify~instagram-profile-scraper";

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
