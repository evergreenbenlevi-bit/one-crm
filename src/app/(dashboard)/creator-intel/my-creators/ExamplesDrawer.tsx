"use client";

import { useState } from "react";
import { X, ExternalLink, Plus, Trash2, Loader2 } from "lucide-react";
import type { Creator, ExamplePost } from "./CreatorCard";

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

export function ExamplesDrawer({ creator, onClose, onSaved }: ExamplesDrawerProps) {
  const [newUrl, setNewUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!creator) return null;

  const examples = creator.example_posts ?? [];
  const status = ANALYSIS_LABELS[creator.analysis_status as keyof typeof ANALYSIS_LABELS] ?? ANALYSIS_LABELS.none;

  async function addExample() {
    if (!newUrl.trim() || !creator) return;
    setSaving(true);
    setError(null);

    try {
      // Extract YouTube thumbnail from URL
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Existing examples */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              דוגמאות ({examples.length})
            </h3>

            {examples.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">אין דוגמאות עדיין</p>
            )}

            {examples.map((ex, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              >
                {/* Thumbnail */}
                <div className="w-24 aspect-video rounded overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                  {ex.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ex.thumbnail_url}
                      alt={ex.title ?? "example"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-xs">No thumbnail</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  {ex.title && (
                    <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">{ex.title}</p>
                  )}
                  {ex.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{ex.notes}</p>
                  )}
                  {ex.hook_text && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 italic line-clamp-1">"{ex.hook_text}"</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {ex.url && (
                      <a
                        href={ex.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                        פתח
                      </a>
                    )}
                    <button
                      onClick={() => removeExample(i)}
                      className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-0.5 transition-colors"
                    >
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
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            הוסף דוגמה
          </h3>
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
