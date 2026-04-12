"use client";

import { ExternalLink, Youtube, Instagram, BookOpen } from "lucide-react";

export interface Creator {
  id: string;
  handle: string;
  platform: string;
  niche: string;
  domain: string | null;
  format_type: string | null;
  display_name: string | null;
  profile_url: string | null;
  thumbnail_url: string | null;
  instagram_username: string | null;
  analysis_status: string | null;
  follower_count: number | null;
  avg_views: number | null;
  engagement_rate: number | null;
  last_synced_at: string | null;
  example_posts: ExamplePost[] | null;
  vault_path: string | null;
  pattern_notes: string | null;
  active: boolean;
}

export interface ExamplePost {
  url?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  notes?: string | null;
  hook_text?: string | null;
  views?: number | null;
}

const DOMAIN_LABELS: Record<string, string> = {
  manifesto: "Manifesto",
  ai_tech: "AI / Tech",
  business: "Business",
  personal: "Personal",
  production: "Production",
  other: "Other",
};

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  full: { color: "bg-emerald-400", label: "ניתוח מלא" },
  partial: { color: "bg-amber-400", label: "חלקי" },
  none: { color: "bg-gray-400 dark:bg-gray-600", label: "טרם התחיל" },
};

function formatNum(n: number | null): string {
  if (n === null || n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function CreatorCard({
  creator,
  onDeactivate,
  onViewExamples,
}: {
  creator: Creator;
  onDeactivate?: (id: string) => void;
  onViewExamples?: (creator: Creator) => void;
}) {
  const status = STATUS_DOT[creator.analysis_status ?? "none"] ?? STATUS_DOT.none;
  const examples = creator.example_posts?.slice(0, 3) ?? [];
  const hasMetrics = creator.follower_count || creator.avg_views;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">

      {/* Thumbnail header */}
      <div className="relative h-20 bg-gray-100 dark:bg-gray-750 overflow-hidden">
        {creator.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.thumbnail_url}
            alt={creator.display_name ?? creator.handle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-300 dark:text-gray-600 select-none">
              {(creator.display_name ?? creator.handle).charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        {/* Analysis status dot */}
        <div
          className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${status.color} ring-2 ring-white dark:ring-gray-800`}
          title={status.label}
        />
        {/* Platform icon */}
        <div className="absolute bottom-2 left-2 bg-black/60 rounded-md p-1">
          {creator.platform === "youtube" ? (
            <Youtube className="w-3.5 h-3.5 text-white" />
          ) : (
            <Instagram className="w-3.5 h-3.5 text-white" />
          )}
        </div>
        {/* Format badge */}
        {creator.format_type && (
          <div className="absolute bottom-2 right-2 bg-black/60 rounded-md px-1.5 py-0.5">
            <span className="text-white text-[10px] font-medium">
              {creator.format_type === "short_form" ? "Short" : creator.format_type === "long_form" ? "Long" : "Both"}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        {/* Name + domain */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                {creator.display_name || creator.handle}
              </span>
              {creator.profile_url && (
                <a
                  href={creator.profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <span className="text-xs text-gray-400">@{creator.handle}</span>
          </div>
          {creator.domain && (
            <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap">
              {DOMAIN_LABELS[creator.domain] ?? creator.domain}
            </span>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {formatNum(creator.follower_count)}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">followers</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {hasMetrics ? formatNum(creator.avg_views) : "—"}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400">avg views</div>
          </div>
        </div>

        {/* Example thumbnails strip */}
        {examples.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Examples</div>
            <div className="flex gap-1">
              {examples.map((ex, i) =>
                ex.thumbnail_url ? (
                  <a
                    key={i}
                    href={ex.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 aspect-video rounded overflow-hidden bg-gray-100 dark:bg-gray-700"
                    title={ex.title ?? undefined}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ex.thumbnail_url}
                      alt={ex.title ?? "example"}
                      className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                    />
                  </a>
                ) : (
                  <div
                    key={i}
                    className="flex-1 aspect-video rounded bg-gray-100 dark:bg-gray-700"
                  />
                )
              )}
              {/* Fill placeholders */}
              {Array.from({ length: Math.max(0, 3 - examples.length) }).map((_, i) => (
                <div
                  key={`ph-${i}`}
                  className="flex-1 aspect-video rounded bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600"
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onViewExamples?.(creator)}
            className="text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            דוגמאות
          </button>
          {onDeactivate && (
            <button
              onClick={() => onDeactivate(creator.id)}
              className="text-[11px] text-gray-400 hover:text-red-400 transition-colors"
            >
              הסר
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
