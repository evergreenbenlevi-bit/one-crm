"use client";

import { useState } from "react";
import useSWR from "swr";
import { Youtube, Instagram, ChevronDown, ChevronRight, Eye, Bookmark, MessageCircle, Play } from "lucide-react";
import { fetcher } from "@/lib/fetcher";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Creator {
  id: string;
  handle: string;
  platform: string;
  display_name: string | null;
  thumbnail_url: string | null;
  follower_count: number | null;
  avg_views: number | null;
  profile_url: string | null;
  active: boolean;
}

interface ViralScan {
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
  transcript: string | null;
  video_url: string | null;
  is_lifetime_top5: boolean | null;
  is_7day_best: boolean | null;
  ben_action: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function viralBadgeClass(score: number | null): string {
  if (score == null) return "bg-white/5 text-gray-500";
  if (score >= 0.8) return "bg-red-500/20 text-red-400";
  if (score >= 0.5) return "bg-amber-500/20 text-amber-400";
  return "bg-white/5 text-gray-400";
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

// ─── Creator List Item ────────────────────────────────────────────────────────

function CreatorItem({
  creator,
  selected,
  onClick,
}: {
  creator: Creator;
  selected: boolean;
  onClick: () => void;
}) {
  const initial = (creator.display_name ?? creator.handle).charAt(0).toUpperCase();
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-lg mx-1 ${
        selected ? "bg-white/5 ring-1 ring-white/10" : "hover:bg-white/[0.03]"
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0 overflow-hidden">
        {creator.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={creator.thumbnail_url}
            alt={initial}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
            {initial}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {creator.platform === "youtube" ? (
            <Youtube className="w-3 h-3 text-red-400 flex-shrink-0" />
          ) : (
            <Instagram className="w-3 h-3 text-pink-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-white truncate">
            {creator.display_name ?? `@${creator.handle}`}
          </span>
        </div>
        <span className="text-xs text-gray-500 truncate block">
          {creator.follower_count != null ? `${fmt(creator.follower_count)} followers` : `@${creator.handle}`}
        </span>
      </div>
    </button>
  );
}

// ─── Video Card ───────────────────────────────────────────────────────────────

function VideoCard({
  scan,
  selected,
  onClick,
}: {
  scan: ViralScan;
  selected: boolean;
  onClick: () => void;
}) {
  const ytId = scan.post_url ? extractYouTubeId(scan.post_url) : null;
  const thumbUrl = ytId ? `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg` : null;
  const title = (scan.title ?? scan.hook_text ?? "(no title)").slice(0, 60);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl overflow-hidden border transition-all ${
        selected
          ? "border-white/20 bg-white/5 ring-1 ring-white/10"
          : "border-white/5 bg-gray-900 hover:border-white/10 hover:bg-white/[0.03]"
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-gray-800 relative overflow-hidden">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-600" />
          </div>
        )}
        {/* Viral score badge */}
        {scan.viral_score != null && (
          <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${viralBadgeClass(scan.viral_score)}`}>
            {scan.viral_score.toFixed(1)}
          </div>
        )}
        {scan.is_lifetime_top5 && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
            TOP 5
          </div>
        )}
        {scan.is_7day_best && !scan.is_lifetime_top5 && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400">
            7D
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1.5">
        <p className="text-xs font-medium text-white leading-snug line-clamp-2">{title}</p>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {fmt(scan.views)}
          </span>
          {scan.likes != null && (
            <span className="flex items-center gap-1">
              <Bookmark className="w-3 h-3" />
              {fmt(scan.likes)}
            </span>
          )}
          {scan.comments != null && (
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {fmt(scan.comments)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Transcript Accordion ─────────────────────────────────────────────────────

function TranscriptAccordion({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/[0.03] transition-colors"
      >
        <span>Full Transcript</span>
        {open ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function VideoDetail({ scan }: { scan: ViralScan }) {
  const ytId = scan.post_url ? extractYouTubeId(scan.post_url) : null;
  const hook = scan.transcript?.slice(0, 150) ?? scan.hook_text?.slice(0, 150) ?? null;

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* YouTube embed */}
      {ytId ? (
        <div className="aspect-video rounded-xl overflow-hidden bg-gray-900">
          <iframe
            src={`https://www.youtube.com/embed/${ytId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            title={scan.title ?? "video"}
          />
        </div>
      ) : scan.post_url ? (
        <a
          href={scan.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="aspect-video rounded-xl overflow-hidden bg-gray-900 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          Open video →
        </a>
      ) : null}

      {/* Title */}
      <div>
        <h3 className="text-sm font-semibold text-white leading-snug">
          {scan.title ?? scan.hook_text ?? "(no title)"}
        </h3>
        <p className="text-xs text-gray-500 mt-1">{scan.week} · {scan.platform}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900 rounded-lg p-2.5 text-center border border-white/5">
          <div className="text-sm font-bold text-white">{fmt(scan.views)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">views</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-2.5 text-center border border-white/5">
          <div className="text-sm font-bold text-white">{fmt(scan.likes)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">likes</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-2.5 text-center border border-white/5">
          <div className="text-sm font-bold text-white">{fmt(scan.comments)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">comments</div>
        </div>
      </div>

      {/* Viral score badge */}
      {scan.viral_score != null && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Viral Score</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${viralBadgeClass(scan.viral_score)}`}>
            {scan.viral_score.toFixed(2)}
          </span>
          {scan.is_lifetime_top5 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">
              Lifetime Top 5
            </span>
          )}
        </div>
      )}

      {/* Hook */}
      {hook && (
        <div className="bg-gray-900 border border-white/5 rounded-xl p-3">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Hook</p>
          <p className="text-sm text-gray-300 leading-relaxed italic">&ldquo;{hook}&rdquo;</p>
        </div>
      )}

      {/* Full transcript */}
      {scan.transcript && <TranscriptAccordion text={scan.transcript} />}
    </div>
  );
}

// ─── Mobile Tab Enum ──────────────────────────────────────────────────────────

type MobileTab = "creators" | "videos" | "detail";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorIntelPage() {
  const [selectedCreatorHandle, setSelectedCreatorHandle] = useState<string | null>(null);
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("creators");

  // Fetch creators
  const { data: creators, isLoading: loadingCreators } = useSWR<Creator[]>(
    "/api/creators?active=true",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Derive selected creator (default to first in list)
  const sortedCreators = (creators ?? []).sort((a, b) =>
    (b.follower_count ?? 0) - (a.follower_count ?? 0)
  );
  const activeHandle = selectedCreatorHandle ?? sortedCreators[0]?.handle ?? null;
  const selectedCreator = sortedCreators.find((c) => c.handle === activeHandle) ?? null;

  // Fetch reels for selected creator
  const reelsUrl = activeHandle
    ? `/api/viral-feed?creator_handle=${encodeURIComponent(activeHandle)}&action=all&limit=100`
    : null;
  const { data: reels, isLoading: loadingReels } = useSWR<ViralScan[]>(
    reelsUrl,
    fetcher,
    { revalidateOnFocus: false }
  );

  const selectedReel = reels?.find((r) => r.id === selectedReelId) ?? null;

  function selectCreator(handle: string) {
    setSelectedCreatorHandle(handle);
    setSelectedReelId(null);
    setMobileTab("videos");
  }

  function selectReel(id: string) {
    setSelectedReelId(id);
    setMobileTab("detail");
  }

  // ─── Panels ─────────────────────────────────────────────────────────────────

  const creatorPanel = (
    <aside className="w-full md:w-60 border-r border-white/5 flex flex-col bg-gray-950 overflow-y-auto">
      <div className="p-4 border-b border-white/5 flex-shrink-0">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Creators</h2>
      </div>
      <div className="flex-1 py-2 space-y-0.5 overflow-y-auto">
        {loadingCreators ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mx-3 h-10 rounded-lg bg-gray-800/60 animate-pulse" />
          ))
        ) : sortedCreators.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8 px-4">No creators yet</p>
        ) : (
          sortedCreators.map((creator) => (
            <CreatorItem
              key={creator.id}
              creator={creator}
              selected={creator.handle === activeHandle}
              onClick={() => selectCreator(creator.handle)}
            />
          ))
        )}
      </div>
    </aside>
  );

  const videoFeedPanel = (
    <main className="flex-1 flex flex-col overflow-hidden border-r border-white/5 bg-gray-950">
      <div className="p-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {selectedCreator?.platform === "youtube" ? (
            <Youtube className="w-4 h-4 text-red-400" />
          ) : selectedCreator?.platform === "instagram" ? (
            <Instagram className="w-4 h-4 text-pink-400" />
          ) : null}
          <h2 className="text-sm font-semibold text-white">
            {selectedCreator
              ? (selectedCreator.display_name ?? `@${selectedCreator.handle}`)
              : "Select a creator"}
          </h2>
        </div>
        <span className="text-xs text-gray-500">{reels?.length ?? 0} videos</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!activeHandle ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Select a creator to see their videos
          </div>
        ) : loadingReels ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-800/60 animate-pulse aspect-video" />
            ))}
          </div>
        ) : !reels || reels.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            No videos found for @{activeHandle}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {reels.map((reel) => (
              <VideoCard
                key={reel.id}
                scan={reel}
                selected={reel.id === selectedReelId}
                onClick={() => selectReel(reel.id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );

  const detailPanel = (
    <aside className="w-full md:w-96 flex flex-col overflow-y-auto bg-gray-950">
      {selectedReel ? (
        <VideoDetail scan={selectedReel} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm p-8 text-center">
          Select a video to see details
        </div>
      )}
    </aside>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Desktop: 3-panel layout */}
      <div className="hidden md:flex h-screen bg-gray-950 text-white overflow-hidden -m-6">
        {creatorPanel}
        {videoFeedPanel}
        {detailPanel}
      </div>

      {/* Mobile: tab-based layout */}
      <div className="flex md:hidden flex-col h-screen bg-gray-950 text-white -m-6">
        {/* Mobile tab bar */}
        <div className="flex border-b border-white/5 flex-shrink-0">
          {(["creators", "videos", "detail"] as MobileTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors border-b-2 -mb-px ${
                mobileTab === tab
                  ? "border-white text-white"
                  : "border-transparent text-gray-500"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Mobile tab content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === "creators" && (
            <div className="h-full overflow-y-auto">
              {/* Strip the border-r and fixed width for mobile */}
              <div className="py-2 space-y-0.5">
                {loadingCreators ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="mx-3 h-10 rounded-lg bg-gray-800/60 animate-pulse" />
                  ))
                ) : sortedCreators.map((creator) => (
                  <CreatorItem
                    key={creator.id}
                    creator={creator}
                    selected={creator.handle === activeHandle}
                    onClick={() => selectCreator(creator.handle)}
                  />
                ))}
              </div>
            </div>
          )}
          {mobileTab === "videos" && (
            <div className="h-full overflow-y-auto">
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  {selectedCreator?.display_name ?? (activeHandle ? `@${activeHandle}` : "Select a creator")}
                </h2>
                <span className="text-xs text-gray-500">{reels?.length ?? 0} videos</span>
              </div>
              <div className="p-4">
                {!activeHandle ? (
                  <p className="text-gray-600 text-sm text-center py-8">Select a creator first</p>
                ) : loadingReels ? (
                  <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-xl bg-gray-800/60 animate-pulse h-24" />
                    ))}
                  </div>
                ) : !reels || reels.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-8">No videos found</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {reels.map((reel) => (
                      <VideoCard
                        key={reel.id}
                        scan={reel}
                        selected={reel.id === selectedReelId}
                        onClick={() => selectReel(reel.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {mobileTab === "detail" && (
            <div className="h-full overflow-y-auto">
              {selectedReel ? (
                <VideoDetail scan={selectedReel} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm p-8 text-center">
                  Select a video from the Videos tab
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
