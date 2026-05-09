"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { LayoutGrid, Calendar, Grid3X3, Plus, Lightbulb, Film, Youtube, Sparkles, X, ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { fetcher } from "@/lib/fetcher";
import { ContentBoard } from "@/components/content/content-board";
import { ContentCalendar } from "@/components/content/content-calendar";
import { ContentFeed } from "@/components/content/content-feed";
import { ContentPieceModal } from "@/components/content/content-piece-modal";
import type { ContentPiece, ContentStatus, ContentFormat, ContentPlatform, SortField } from "@/components/content/types";
import {
  CONTENT_STATUSES,
  STATUS_LABELS,
  STATUS_DOT,
  FORMAT_OPTIONS,
  FORMAT_LABELS,
  PLATFORM_OPTIONS,
  PLATFORM_LABELS,
  SORT_OPTIONS,
} from "@/components/content/types";

// ─── Legacy ideas link ─────────────────────────────────────────────────────────
import Link from "next/link";

type HubView = "board" | "calendar" | "feed";

const VIEW_TABS: { key: HubView; label: string; icon: React.ElementType }[] = [
  { key: "board", label: "Board", icon: LayoutGrid },
  { key: "calendar", label: "Calendar", icon: Calendar },
  { key: "feed", label: "Feed", icon: Grid3X3 },
];

// ─── Generic pill filter row ───────────────────────────────────────────────────
function PillFilters<T extends string>({
  options,
  labels,
  active,
  onChange,
  allLabel = "All",
}: {
  options: T[];
  labels: Record<string, string>;
  active: T | "all";
  onChange: (v: T | "all") => void;
  allLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <button
        onClick={() => onChange("all")}
        className={clsx(
          "text-xs px-3 py-1 rounded-full border transition-colors",
          active === "all"
            ? "bg-gray-100 text-gray-950 border-gray-100"
            : "border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300"
        )}
      >
        {allLabel}
      </button>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={clsx(
            "text-xs px-2.5 py-1 rounded-full border transition-colors",
            active === opt
              ? "bg-gray-800 text-gray-100 border-gray-600"
              : "border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400"
          )}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

// ─── Status filter pills ───────────────────────────────────────────────────────
function StatusFilters({
  active,
  onChange,
}: {
  active: ContentStatus | "all";
  onChange: (s: ContentStatus | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <button
        onClick={() => onChange("all")}
        className={clsx(
          "text-xs px-3 py-1 rounded-full border transition-colors",
          active === "all"
            ? "bg-gray-100 text-gray-950 border-gray-100"
            : "border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300"
        )}
      >
        All
      </button>
      {CONTENT_STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={clsx(
            "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
            active === s
              ? "bg-gray-800 text-gray-100 border-gray-600"
              : "border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-400"
          )}
        >
          <span className={clsx("w-1.5 h-1.5 rounded-full", STATUS_DOT[s])} />
          {STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

// ─── Sort selector ─────────────────────────────────────────────────────────────
function SortSelector({
  sortBy,
  order,
  onSortChange,
  onOrderToggle,
}: {
  sortBy: SortField;
  order: "asc" | "desc";
  onSortChange: (s: SortField) => void;
  onOrderToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortField)}
          className="appearance-none bg-gray-900 border border-gray-800 text-gray-400 text-xs rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-gray-600 cursor-pointer hover:border-gray-700 hover:text-gray-300 transition-colors"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
      </div>
      <button
        onClick={onOrderToggle}
        className="text-xs px-2 py-1.5 rounded-lg border border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300 transition-colors"
        title={order === "desc" ? "Descending" : "Ascending"}
      >
        {order === "desc" ? "↓" : "↑"}
      </button>
    </div>
  );
}

// ─── Active filter chips ───────────────────────────────────────────────────────
function ActiveFilterChips({
  platformFilter,
  formatFilter,
  onClearPlatform,
  onClearFormat,
  onClearAll,
}: {
  platformFilter: ContentPlatform | "all";
  formatFilter: ContentFormat | "all";
  onClearPlatform: () => void;
  onClearFormat: () => void;
  onClearAll: () => void;
}) {
  const hasFilters = platformFilter !== "all" || formatFilter !== "all";
  if (!hasFilters) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-gray-600">Active:</span>
      {platformFilter !== "all" && (
        <button
          onClick={onClearPlatform}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          {PLATFORM_LABELS[platformFilter]}
          <X size={10} />
        </button>
      )}
      {formatFilter !== "all" && (
        <button
          onClick={onClearFormat}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          {FORMAT_LABELS[formatFilter]}
          <X size={10} />
        </button>
      )}
      <button
        onClick={onClearAll}
        className="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
      >
        Clear all
      </button>
    </div>
  );
}

// ─── Legacy ideas banner ───────────────────────────────────────────────────────
function LegacyIdeasBanner() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 border border-gray-800 rounded-lg px-3 py-2">
      <Lightbulb size={12} />
      <span>Legacy ideas:</span>
      {[
        { label: "Short Form", icon: Film },
        { label: "Long Form", icon: Youtube },
        { label: "Inspiration", icon: Sparkles },
      ].map(({ label, icon: Icon }) => (
        <Link
          key={label}
          href="/content/legacy"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Icon size={11} />
          {label}
        </Link>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ContentPage() {
  const [view, setView] = useState<HubView>("board");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [platformFilter, setPlatformFilter] = useState<ContentPlatform | "all">("all");
  const [formatFilter, setFormatFilter] = useState<ContentFormat | "all">("all");
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingPiece, setEditingPiece] = useState<ContentPiece | null>(null);

  // Build query string from all active filters
  const buildQuery = () => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (platformFilter !== "all") params.set("platform", platformFilter);
    if (formatFilter !== "all") params.set("format", formatFilter);
    if (sortBy !== "created_at" || sortOrder !== "desc") {
      params.set("sort", sortBy);
      params.set("order", sortOrder);
    }
    const str = params.toString();
    return str ? `?${str}` : "";
  };

  const queryStr = buildQuery();
  const { data, isLoading, mutate } = useSWR<ContentPiece[]>(
    `/api/content-pieces${queryStr}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const pieces: ContentPiece[] = Array.isArray(data) ? data : [];

  const handleStatusChange = useCallback(
    async (id: string, status: ContentStatus) => {
      await fetch(`/api/content-pieces/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      mutate();
    },
    [mutate]
  );

  const handleCreate = useCallback(
    async (data: Partial<ContentPiece>) => {
      await fetch("/api/content-pieces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      mutate();
    },
    [mutate]
  );

  const handleUpdate = useCallback(
    async (data: Partial<ContentPiece>) => {
      if (!editingPiece) return;
      await fetch(`/api/content-pieces/${editingPiece.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      mutate();
    },
    [editingPiece, mutate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await fetch(`/api/content-pieces/${id}`, { method: "DELETE" });
      mutate();
    },
    [mutate]
  );

  // Summary counts (always count against full unfiltered list when board view)
  const counts = Object.fromEntries(
    CONTENT_STATUSES.map((s) => [s, pieces.filter((p) => p.status === s).length])
  ) as Record<ContentStatus, number>;

  const hasActiveFilters = platformFilter !== "all" || formatFilter !== "all";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-50">Content Hub</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {pieces.length} piece{pieces.length !== 1 ? "s" : ""}
              {statusFilter !== "all" && (
                <span className="ml-1 text-gray-600">
                  · filtered by {STATUS_LABELS[statusFilter]}
                </span>
              )}
              {platformFilter !== "all" && (
                <span className="ml-1 text-gray-600">
                  · {PLATFORM_LABELS[platformFilter]}
                </span>
              )}
              {formatFilter !== "all" && (
                <span className="ml-1 text-gray-600">
                  · {FORMAT_LABELS[formatFilter]}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <LegacyIdeasBanner />
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-white text-gray-950 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              New Piece
            </button>
          </div>
        </div>

        {/* ── Pipeline stats ── */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {CONTENT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={clsx(
                "bg-gray-900 border rounded-lg p-3 text-center transition-all hover:border-gray-600",
                statusFilter === s ? "border-gray-500 bg-gray-800" : "border-gray-800"
              )}
            >
              <div
                className="text-xl font-bold text-white font-semibold"
              >
                {counts[s] ?? 0}
              </div>
              <div className="text-[10px] text-gray-600 font-medium uppercase tracking-wide mt-0.5">
                {STATUS_LABELS[s]}
              </div>
            </button>
          ))}
        </div>

        {/* ── View tabs + sort ── */}
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          {/* View switcher */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {VIEW_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  view === key
                    ? "bg-gray-700 text-gray-100"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <SortSelector
            sortBy={sortBy}
            order={sortOrder}
            onSortChange={setSortBy}
            onOrderToggle={() => setSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
          />
        </div>

        {/* ── Filter rows ── */}
        <div className="flex flex-col gap-2 mb-5">
          {/* Platform filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-600 w-14 shrink-0">Platform</span>
            <PillFilters<ContentPlatform>
              options={PLATFORM_OPTIONS}
              labels={PLATFORM_LABELS}
              active={platformFilter}
              onChange={setPlatformFilter}
            />
          </div>

          {/* Format filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-600 w-14 shrink-0">Format</span>
            <PillFilters<ContentFormat>
              options={FORMAT_OPTIONS}
              labels={FORMAT_LABELS}
              active={formatFilter}
              onChange={setFormatFilter}
            />
          </div>

          {/* Status filters — hide in board view since board shows all columns */}
          {view !== "board" && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-600 w-14 shrink-0">Status</span>
              <StatusFilters active={statusFilter} onChange={setStatusFilter} />
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <ActiveFilterChips
              platformFilter={platformFilter}
              formatFilter={formatFilter}
              onClearPlatform={() => setPlatformFilter("all")}
              onClearFormat={() => setFormatFilter("all")}
              onClearAll={() => {
                setPlatformFilter("all");
                setFormatFilter("all");
              }}
            />
          )}
        </div>

        {/* ── View content ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-gray-600 text-sm">
            Loading...
          </div>
        ) : (
          <>
            {view === "board" && (
              <ContentBoard
                pieces={pieces}
                onStatusChange={handleStatusChange}
                onEdit={(p) => setEditingPiece(p)}
              />
            )}
            {view === "calendar" && (
              <ContentCalendar
                pieces={pieces}
                onEdit={(p) => setEditingPiece(p)}
              />
            )}
            {view === "feed" && (
              <ContentFeed
                pieces={pieces}
                onEdit={(p) => setEditingPiece(p)}
              />
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      {showNewModal && (
        <ContentPieceModal
          onClose={() => setShowNewModal(false)}
          onSave={handleCreate}
        />
      )}

      {editingPiece && (
        <ContentPieceModal
          piece={editingPiece}
          onClose={() => setEditingPiece(null)}
          onSave={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
