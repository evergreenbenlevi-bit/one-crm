"use client";

import { useEffect, useState } from "react";
import { Youtube, ExternalLink, TrendingUp } from "lucide-react";

interface BenSnapshot {
  id: string;
  platform: string;
  week: string;
  post_url: string | null;
  title: string | null;
  thumbnail_url: string | null;
  views: number;
  likes: number;
  comments: number;
  publish_date: string | null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500">{label}</div>
    </div>
  );
}

export default function BenPerformanceSection() {
  const [snapshots, setSnapshots] = useState<BenSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ben-performance")
      .then((r) => r.json())
      .then((d) => { setSnapshots(d.snapshots || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const avgViews =
    snapshots.length > 0
      ? Math.round(snapshots.reduce((s, v) => s + (v.views || 0), 0) / snapshots.length)
      : 0;
  const totalViews = snapshots.reduce((s, v) => s + (v.views || 0), 0);
  const topVideo = snapshots.reduce(
    (top, v) => (!top || v.views > top.views ? v : top),
    null as BenSnapshot | null
  );

  const isConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-8 text-center">
        <Youtube size={32} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">אין נתוני ביצועים עדיין</p>
        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
          הגדר BEN_YOUTUBE_CHANNEL_ID ב-.env.local והפעל את ה-cron
        </p>
        <a
          href="/api/crons/ben-youtube-sync"
          className="inline-flex items-center gap-1.5 mt-4 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 transition-colors"
        >
          <TrendingUp size={12} />
          הפעל סנכרון ידני
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
          <Stat label="צפיות ממוצע" value={formatNum(avgViews)} />
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
          <Stat label="צפיות סה״כ" value={formatNum(totalViews)} />
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
          <Stat label="סרטונים" value={String(snapshots.length)} />
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {snapshots.slice(0, 10).map((snap) => (
          <div
            key={snap.id}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            {snap.thumbnail_url ? (
              <img
                src={snap.thumbnail_url}
                alt={snap.title || ""}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Youtube size={20} className="text-gray-300 dark:text-gray-600" />
              </div>
            )}
            <div className="p-2.5 space-y-1">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2 leading-tight">
                {snap.title || "ללא כותרת"}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {formatNum(snap.views)} צפיות
                </span>
                {snap.post_url && (
                  <a
                    href={snap.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                  >
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              {snap.publish_date && (
                <p className="text-[10px] text-gray-300 dark:text-gray-600">
                  {new Date(snap.publish_date).toLocaleDateString("he-IL", { month: "short", day: "numeric" })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {topVideo && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          הסרטון המוביל: &ldquo;{topVideo.title}&rdquo; — {formatNum(topVideo.views)} צפיות
        </p>
      )}
    </div>
  );
}
