"use client";

import { useState } from "react";
import useSWR from "swr";
import { Newspaper, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { clsx } from "clsx";
import { fetcher } from "@/lib/fetcher";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  topic: string;
}

const TOPIC_TABS = [
  { key: "all", label: "הכל" },
  { key: "ai", label: "AI & Tools" },
  { key: "research", label: "Deep Research" },
];

const SOURCE_COLORS: Record<string, string> = {
  "Hacker News":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  TechCrunch:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "The Verge":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  VentureBeat:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60) return "עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
    if (diff < 604800) return `לפני ${Math.floor(diff / 86400)} ימים`;
    return new Date(dateStr).toLocaleDateString("he-IL");
  } catch {
    return "";
  }
}

export default function NewsPage() {
  const [topic, setTopic] = useState("all");
  const [source, setSource] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading: loading } = useSWR(
    `/api/news?topic=${topic}&k=${refreshKey}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );
  const items: NewsItem[] = Array.isArray(data) ? data : [];

  const sources = ["all", ...Array.from(new Set(items.map((i) => i.source)))];

  const filtered =
    source === "all" ? items : items.filter((i) => i.source === source);

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">חדשות AI</h1>
          <span className="text-sm text-gray-400">
            {filtered.length} כתבות
          </span>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          רענן
        </button>
      </div>

      {/* Topic Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit mb-4">
        {TOPIC_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => {
              setTopic(key);
              setSource("all");
            }}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              topic === key
                ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Source Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sources.map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              source === s
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-400"
            )}
          >
            {s === "all" ? "כל המקורות" : s}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-3 w-3/4" />
              <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded mb-2" />
              <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Newspaper size={40} className="mx-auto mb-3 opacity-30" />
          <p>לא נמצאו כתבות</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
            >
              {/* Source + Time */}
              <div className="flex items-center justify-between mb-3">
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    SOURCE_COLORS[item.source] ||
                      "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  )}
                >
                  {item.source}
                </span>
                <div className="flex items-center gap-1 text-gray-400 text-xs">
                  <Clock size={11} />
                  {timeAgo(item.pubDate)}
                </div>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {item.title}
              </h3>

              {/* Description */}
              {item.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end mt-3">
                <ExternalLink
                  size={13}
                  className="text-gray-300 group-hover:text-blue-400 transition-colors"
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
