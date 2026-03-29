import { NextRequest, NextResponse } from "next/server";

const RSS_FEEDS = [
  // ── Tier 1: AI Practitioner Core ─────────────────────────────
  {
    url: "https://simonwillison.net/atom/everything/",
    source: "Simon Willison",
    topic: "ai",
  },
  {
    url: "https://www.latent.space/feed",
    source: "Latent Space",
    topic: "ai",
  },
  {
    url: "https://tldr.tech/api/rss/ai",
    source: "TLDR AI",
    topic: "ai",
  },
  {
    url: "https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml",
    source: "The Rundown AI",
    topic: "ai",
  },
  // ── Tier 2: Labs & Tools ──────────────────────────────────────
  {
    url: "https://huggingface.co/blog/feed.xml",
    source: "HuggingFace",
    topic: "ai",
  },
  {
    url: "https://openai.com/blog/rss.xml",
    source: "OpenAI",
    topic: "ai",
  },
  {
    url: "https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml",
    source: "Anthropic",
    topic: "ai",
  },
  {
    url: "https://blog.google/technology/ai/rss/",
    source: "Google AI",
    topic: "ai",
  },
  // ── Tier 3: Deep Research ────────────────────────────────────
  {
    url: "https://www.interconnects.ai/feed",
    source: "Interconnects",
    topic: "research",
  },
  {
    url: "https://magazine.sebastianraschka.com/feed",
    source: "Ahead of AI",
    topic: "research",
  },
  {
    url: "https://importai.substack.com/feed",
    source: "Import AI",
    topic: "research",
  },
  // ── Hacker News ───────────────────────────────────────────────
  {
    url: "https://hnrss.org/frontpage?q=AI+OR+LLM+OR+Claude+OR+agent&count=30",
    source: "Hacker News",
    topic: "ai",
  },
];

function extractText(str: string): string {
  const cdata = str.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdata) return cdata[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRSSItems(xml: string, source: string, topic: string) {
  const items: NewsItem[] = [];

  const isAtom = !xml.includes("<item>");
  const regex = isAtom
    ? /<entry>([\s\S]*?)<\/entry>/g
    : /<item>([\s\S]*?)<\/item>/g;

  let match;
  while ((match = regex.exec(xml)) !== null) {
    const item = match[1];

    const titleMatch = item.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const title = titleMatch ? extractText(titleMatch[1]) : "";
    if (!title) continue;

    let link = "";
    if (isAtom) {
      const linkMatch = item.match(/<link[^>]+href="([^"]+)"/);
      link = linkMatch ? linkMatch[1] : "";
    } else {
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
      link = linkMatch ? extractText(linkMatch[1]) : "";
    }
    if (!link) continue;

    const dateMatch =
      item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ||
      item.match(/<published>([\s\S]*?)<\/published>/) ||
      item.match(/<updated>([\s\S]*?)<\/updated>/);
    const pubDate = dateMatch ? dateMatch[1].trim() : "";

    const descMatch =
      item.match(/<description>([\s\S]*?)<\/description>/) ||
      item.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    const description = descMatch
      ? extractText(descMatch[1]).substring(0, 220)
      : "";

    items.push({ title, link, pubDate, description, source, topic, relevanceScore: 5 });
  }

  return items;
}

type NewsItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  topic: string;
  relevanceScore: number;
};

// Score items using Claude Haiku — single batch call
async function scoreItems(items: NewsItem[]): Promise<NewsItem[]> {
  if (!process.env.ANTHROPIC_API_KEY || items.length === 0) return items;

  try {
    const headlines = items
      .map((item, i) => `${i + 1}. ${item.title}`)
      .join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Rate each headline for relevance to a founder/creator who cares about: AI agents, LLMs, automation tools, content creation AI, business growth with AI, new AI frameworks/models.
LOW relevance (1-3): job postings, hiring announcements, unrelated tech, math proofs, specific coding tools unrelated to AI business.
HIGH relevance (8-10): new AI models, agent frameworks, automation breakthroughs, AI for content/business.

Return ONLY a JSON array of integers 0-10, one per headline, same order. Example: [8,3,7,...]

Headlines:
${headlines}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return items;

    const data = await res.json();
    const text = data?.content?.[0]?.text ?? "";
    const match = text.match(/\[[\d,\s]+\]/);
    if (!match) return items;

    const scores: number[] = JSON.parse(match[0]);

    return items.map((item, i) => ({
      ...item,
      relevanceScore: typeof scores[i] === "number" ? Math.min(10, Math.max(0, scores[i])) : 5,
    }));
  } catch {
    // Scoring failed — return items with default score
    return items;
  }
}

// Module-level cache — survives across requests in the same process instance
const _cache: Map<string, { items: NewsItem[]; ts: number }> = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const topic = searchParams.get("topic") || "all";

  // Serve from in-process cache if fresh
  const cached = _cache.get(topic);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.items, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
    });
  }

  const feeds =
    topic === "all" ? RSS_FEEDS : RSS_FEEDS.filter((f) => f.topic === topic);

  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        next: { revalidate: 3600 },
        headers: { "User-Agent": "ONE-CRM/1.0 (+https://one-crm.vercel.app)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return parseRSSItems(text, feed.source, feed.topic);
    })
  );

  const rawItems = (results
    .filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<NewsItem[]>[])
    .flatMap((r) => r.value)
    .sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    })
    .slice(0, 60);

  // AI scoring — batch, cached with items
  const scoredItems = await scoreItems(rawItems);

  // Sort: score desc, then date desc for ties
  scoredItems.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    const da = new Date(a.pubDate).getTime() || 0;
    const db = new Date(b.pubDate).getTime() || 0;
    return db - da;
  });

  _cache.set(topic, { items: scoredItems, ts: Date.now() });

  return NextResponse.json(scoredItems, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
  });
}
