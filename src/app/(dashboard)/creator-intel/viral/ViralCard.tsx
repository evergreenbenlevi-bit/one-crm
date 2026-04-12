"use client";

import { useState } from "react";
import { ExternalLink, Repeat2, Bookmark, X, Eye, Heart, MessageCircle } from "lucide-react";

export interface ViralScan {
  id: string;
  week: string;
  niche: string;
  platform: string;
  post_url: string;
  creator_handle: string | null;
  creator_followers: number | null;
  title: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagement_ratio: number | null;
  viral_score: number | null;
  hook_text: string | null;
  ben_action: string;
}

interface ViralCardProps {
  scan: ViralScan;
  onAction: (id: string, action: "saved" | "repurpose" | "dismiss") => Promise<void>;
}

function fmt(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const NICHE_LABEL: Record<string, string> = {
  ai_creator: "AI",
  business_coach: "Business",
  confessional: "Manifesto",
  other: "Other",
};

const PLATFORM_COLOR: Record<string, string> = {
  youtube: "bg-red-500/10 text-red-500",
  instagram: "bg-pink-500/10 text-pink-500",
};

export function ViralCard({ scan, onAction }: ViralCardProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [actioned, setActioned] = useState(false);

  async function handleAction(action: "saved" | "repurpose" | "dismiss") {
    setLoading(action);
    try {
      await onAction(scan.id, action);
      setActioned(true);
    } finally {
      setLoading(null);
    }
  }

  const score = scan.viral_score != null ? Math.round(scan.viral_score * 100) / 100 : null;
  const engPct = scan.engagement_ratio != null
    ? `${(scan.engagement_ratio * 100).toFixed(1)}%`
    : null;

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-opacity ${
      actioned ? "opacity-30 pointer-events-none" : ""
    } border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${PLATFORM_COLOR[scan.platform] ?? "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
              {scan.platform}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {NICHE_LABEL[scan.niche] ?? scan.niche}
            </span>
            {scan.creator_handle && (
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                @{scan.creator_handle}
              </span>
            )}
            {scan.creator_followers && (
              <span className="text-xs text-gray-400">{fmt(scan.creator_followers)} followers</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug">
            {scan.title || scan.hook_text || "(no title)"}
          </p>
          {scan.hook_text && scan.title && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic">
              &ldquo;{scan.hook_text.slice(0, 100)}&rdquo;
            </p>
          )}
        </div>
        <a
          href={scan.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" /> {fmt(scan.views)}
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3 h-3" /> {fmt(scan.likes)}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" /> {fmt(scan.comments)}
        </span>
        {engPct && (
          <span className="text-gray-400">{engPct} eng</span>
        )}
        {score != null && (
          <span className="ml-auto font-semibold text-gray-700 dark:text-gray-200">
            {score.toFixed(1)} score
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => handleAction("saved")}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
            bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700
            text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-50"
        >
          <Bookmark className="w-3.5 h-3.5" />
          {loading === "saved" ? "..." : "Save"}
        </button>
        <button
          onClick={() => handleAction("repurpose")}
          disabled={!!loading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
            bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100
            text-white dark:text-gray-900 transition-colors disabled:opacity-50"
        >
          <Repeat2 className="w-3.5 h-3.5" />
          {loading === "repurpose" ? "..." : "Repurpose →"}
        </button>
        <button
          onClick={() => handleAction("dismiss")}
          disabled={!!loading}
          className="px-2 py-1.5 text-xs font-medium rounded-lg
            text-gray-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
            transition-colors disabled:opacity-50"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
