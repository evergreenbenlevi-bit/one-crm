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
  const items: {
    title: string;
    link: string;
    pubDate: string;
    description: string;
    source: string;
    topic: string;
  }[] = [];

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

    items.push({ title, link, pubDate, description, source, topic });
  }

  return items;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const topic = searchParams.get("topic") || "all";

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

  type NewsItem = { title: string; link: string; pubDate: string; description: string; source: string; topic: string };
  const allItems = (results
    .filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<NewsItem[]>[])
    .flatMap((r) => r.value)
    .sort((a, b) => {
      const da = new Date(a.pubDate).getTime() || 0;
      const db = new Date(b.pubDate).getTime() || 0;
      return db - da;
    })
    .slice(0, 60);

  return NextResponse.json(allItems, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
  });
}
