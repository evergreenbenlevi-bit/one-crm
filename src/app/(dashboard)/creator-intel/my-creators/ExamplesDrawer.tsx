"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink, Plus, Trash2, Loader2, FileText } from "lucide-react";
import type { Creator, ExamplePost } from "./CreatorCard";

interface TopPost {
  url?: string | null;
  title?: string | null;
  views?: number | null;
  thumbnail_url?: string | null;
  published_at?: string | null;
}

interface LatestSnapshot {
  top_posts: TopPost[] | null;
  top_thumbnail_url: string | null;
  followers: number | null;
  avg_views: number | null;
  captured_at: string | null;
}

interface ExamplesDrawerProps {
  creator: Creator | null;
  onClose: () => void;
  onSaved?: () => void;
}

const ANALYSIS_LABELS = {
  full: { label: "ניתוח מלא", color: "text-emerald-400" },
  partial: { label: "חלקי", color: "text-amber-400" },
  none: { label: "טרם התחיל", color: "text-gray-400" },
};

function formatNum(n: number | null): string {
  if (n === null || n === 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function ExamplesDrawer({ creator, onClose, onSaved }: ExamplesDrawerProps) {
  const [newUrl, setNewUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<LatestSnapshot | null>(null);
  const [patternNotes, setPatternNotes] = useState(creator?.pattern_notes ?? "");
  const [savingPattern, setSavingPattern] = useState(false);

  // Fetch latest snapshot when drawer opens
  useEffect(() => {
    if (!creator) return;
    fetch(`/api/snapshots?creator_id=${creator.id}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.data;
        if (rows?.length > 0) setSnapshot(rows[0]);
      })
      .catch(() => null);
  }, [creator?.id]);

  // Sync pattern_notes when creator changes
  useEffect(() => {
    setPatternNotes(creator?.pattern_notes ?? "");
  }, [creator?.pattern_notes]);

  if (!creator) return null;

  const examples = creator.example_posts ?? [];
  const status = ANALYSIS_LABELS[creator.analysis_status as keyof typeof ANALYSIS_LABELS] ?? ANALYSIS_LABELS.none;
  const topPosts: TopPost[] = snapshot?.top_posts?.slice(0, 5) ?? [];

  async function addExample() {
    if (!newUrl.trim() || !creator) return;
    setSaving(true);
    setError(null);

    try {
      let thumbnailUrl: string | null = null;
      const ytMatch = newUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        thumbnailUrl = `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`;
      }

      const newExample: ExamplePost = {
        url: newUrl.trim(),
        thumbnail_url: thumbnailUrl,
        title: null,
        notes: newNotes.trim() || null,
        hook_text: null,
        views: null,
      };

      const updatedExamples = [...examples, newExample];

      const res = await fetch(`/api/creators`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: creator.id, example_posts: updatedExamples }),
      });

      if (!res.ok) throw new Error("שמירה נכשלה");

      setNewUrl("");
      setNewNotes("");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה לא ידועה");
    } finally {
      setSaving(false);
    }
  }

  async function removeExample(index: number) {
    if (!creator) return;
    const updatedExamples = examples.filter((_, i) => i !== index);
    await fetch(`/api/creators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: creator.id, example_posts: updatedExamples }),
    });
    onSaved?.();
  }

  async function savePatternNotes() {
    if (!creator) return;
    setSavingPattern(true);
    await fetch(`/api/creators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: creator.id, pattern_notes: patternNotes }),
    });
    setSavingPattern(false);
    onSaved?.();
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                {creator.display_name ?? creator.handle}
              </h2>
              <span className={`text-xs ${status.color}`}>{status.label}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">@{creator.handle} · {creator.platform}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Latest Videos from Snapshot */}
          {topPosts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  סרטונים אחרונים ({topPosts.length})
                </h3>
                {snapshot?.captured_at && (
                  <span className="text-[10px] text-gray-400">
                    {new Date(snapshot.captured_at).toLocaleDateString("he-IL")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {topPosts.map((post, i) => (
                  <a
                    key={i}
                    href={post.url ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                  >
                    <div className="aspect-video">
                      {post.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.thumbnail_url}
                          alt={post.title ?? "video"}
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xs text-gray-400">No thumbnail</span>
                        </div>
                      )}
                    </div>
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {/* Views badge */}
                    {post.views && (
                      <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5">
                        <span className="text-white text-[10px] font-medium">{formatNum(post.views)}</span>
                      </div>
                    )}
                    {/* External link icon */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/60 rounded p-0.5">
                        <ExternalLink className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              {/* Title of first video as example */}
              {topPosts[0]?.title && (
                <p className="text-[11px] text-gray-400 line-clamp-1 italic">{topPosts[0].title}</p>
              )}
            </div>
          )}

          {/* Pattern Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                מה עובד פה
              </h3>
            </div>
            <textarea
              value={patternNotes}
              onChange={(e) => setPatternNotes(e.target.value)}
              placeholder="תבניות שחוזרות — thumbnail style, hook framework, format, מה שבולט..."
              rows={4}
              className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white resize-none"
            />
            <button
              onClick={savePatternNotes}
              disabled={savingPattern || patternNotes === (creator.pattern_notes ?? "")}
              className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {savingPattern ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              שמור הערות
            </button>
          </div>

          {/* Curated examples */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              דוגמאות ({examples.length})
            </h3>

            {examples.length === 0 && (
              <p className="text-sm text-gray-400 py-2 text-center">אין דוגמאות עדיין</p>
            )}

            {examples.map((ex, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                <div className="w-24 aspect-video rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                  {ex.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ex.thumbnail_url} alt={ex.title ?? "example"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-xs">No thumbnail</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {ex.title && <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">{ex.title}</p>}
                  {ex.notes && <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{ex.notes}</p>}
                  {ex.hook_text && <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-1">"{ex.hook_text}"</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {ex.url && (
                      <a href={ex.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
                        <ExternalLink className="w-3 h-3" />
                        פתח
                      </a>
                    )}
                    <button onClick={() => removeExample(i)} className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-0.5 transition-colors">
                      <Trash2 className="w-3 h-3" />
                      הסר
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add example form */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">הוסף דוגמה</h3>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL לסרטון / פוסט..."
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            onKeyDown={(e) => e.key === "Enter" && addExample()}
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="הערות (אופציונלי)..."
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={addExample}
            disabled={!newUrl.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            הוסף
          </button>
        </div>
      </div>
    </>
  );
}
