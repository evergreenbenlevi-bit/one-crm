/**
 * YouTube Data API v3 client
 * Used by: /api/crons/youtube-sync, /api/creators/[id]/sync
 */

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeChannelStats {
  channelId: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: number;
  viewCount: number;
}

export interface YouTubeVideoSummary {
  videoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
  url: string;
}

export interface YouTubeCreatorSnapshot {
  channel: YouTubeChannelStats;
  recentVideos: YouTubeVideoSummary[];
  topVideo: YouTubeVideoSummary | null;
  avgViews: number;
}

/**
 * Search for a YouTube channel by handle or name, return channel ID
 */
export async function findChannelId(query: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");

  // Try handle search first (e.g. @sergegatari)
  const handle = query.startsWith("@") ? query.slice(1) : query;
  const searchUrl = `${YT_API_BASE}/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${apiKey}`;

  const res = await fetch(searchUrl);
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);

  const data = await res.json();
  const item = data.items?.[0];
  return item?.snippet?.channelId || item?.id?.channelId || null;
}

/**
 * Get channel statistics by channel ID
 */
export async function getChannelStats(channelId: string): Promise<YouTubeChannelStats | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");

  const url = `${YT_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const ch = data.items?.[0];
  if (!ch) return null;

  return {
    channelId,
    title: ch.snippet.title,
    thumbnailUrl: ch.snippet.thumbnails?.medium?.url || ch.snippet.thumbnails?.default?.url || "",
    subscriberCount: parseInt(ch.statistics.subscriberCount || "0"),
    viewCount: parseInt(ch.statistics.viewCount || "0"),
  };
}

/**
 * Get recent videos for a channel (last N videos)
 */
export async function getRecentVideos(channelId: string, maxResults = 5): Promise<YouTubeVideoSummary[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");

  // Step 1: get video IDs from search
  const searchUrl = `${YT_API_BASE}/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return [];

  const searchData = await searchRes.json();
  const videoIds = (searchData.items || []).map((i: { id: { videoId: string } }) => i.id.videoId).filter(Boolean);
  if (videoIds.length === 0) return [];

  // Step 2: get full stats for video IDs
  const statsUrl = `${YT_API_BASE}/videos?part=snippet,statistics&id=${videoIds.join(",")}&key=${apiKey}`;
  const statsRes = await fetch(statsUrl);
  if (!statsRes.ok) return [];

  const statsData = await statsRes.json();
  return (statsData.items || []).map((v: {
    id: string;
    snippet: { title: string; publishedAt: string; thumbnails: { maxres?: { url: string }; high?: { url: string }; medium?: { url: string }; default?: { url: string } } };
    statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  }) => ({
    videoId: v.id,
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    viewCount: parseInt(v.statistics.viewCount || "0"),
    likeCount: parseInt(v.statistics.likeCount || "0"),
    commentCount: parseInt(v.statistics.commentCount || "0"),
    thumbnailUrl:
      v.snippet.thumbnails?.maxres?.url ||
      v.snippet.thumbnails?.high?.url ||
      v.snippet.thumbnails?.medium?.url ||
      v.snippet.thumbnails?.default?.url ||
      "",
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));
}

/**
 * Full snapshot for a creator — channel stats + recent videos
 */
export async function getCreatorSnapshot(channelId: string): Promise<YouTubeCreatorSnapshot | null> {
  const [channel, recentVideos] = await Promise.all([
    getChannelStats(channelId),
    getRecentVideos(channelId, 5),
  ]);

  if (!channel) return null;

  const topVideo = recentVideos.length > 0
    ? recentVideos.reduce((a, b) => (a.viewCount > b.viewCount ? a : b))
    : null;

  const avgViews = recentVideos.length > 0
    ? Math.round(recentVideos.reduce((sum, v) => sum + v.viewCount, 0) / recentVideos.length)
    : 0;

  return { channel, recentVideos, topVideo, avgViews };
}
