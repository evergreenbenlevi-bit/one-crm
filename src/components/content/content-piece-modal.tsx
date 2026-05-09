"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { ContentPiece, ContentStatus } from "./types";
import {
  CONTENT_STATUSES,
  STATUS_LABELS,
  STATUS_DOT,
} from "./types";

interface ContentPieceModalProps {
  piece?: ContentPiece | null;
  onClose: () => void;
  onSave: (data: Partial<ContentPiece>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const FORMATS = ["reel", "carousel", "post", "story"] as const;
const PLATFORMS = ["instagram", "youtube", "both"] as const;

const inputClass =
  "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors";

const labelClass = "block text-xs font-medium text-gray-400 mb-1";

export function ContentPieceModal({ piece, onClose, onSave, onDelete }: ContentPieceModalProps) {
  const isEdit = !!piece;

  const [title, setTitle] = useState(piece?.title ?? "");
  const [hook, setHook] = useState(piece?.hook ?? "");
  const [angle, setAngle] = useState(piece?.angle ?? "");
  const [format, setFormat] = useState<string>(piece?.format ?? "");
  const [platform, setPlatform] = useState<string>(piece?.platform ?? "instagram");
  const [pillar, setPillar] = useState(piece?.pillar ?? "");
  const [status, setStatus] = useState<ContentStatus>(piece?.status ?? "idea");
  const [filmDate, setFilmDate] = useState(piece?.film_date ?? "");
  const [publishDate, setPublishDate] = useState(piece?.publish_date ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync if piece changes (unlikely but safe)
  useEffect(() => {
    if (piece) {
      setTitle(piece.title);
      setHook(piece.hook ?? "");
      setAngle(piece.angle ?? "");
      setFormat(piece.format ?? "");
      setPlatform(piece.platform ?? "instagram");
      setPillar(piece.pillar ?? "");
      setStatus(piece.status);
      setFilmDate(piece.film_date ?? "");
      setPublishDate(piece.publish_date ?? "");
    }
  }, [piece]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        hook: hook || null,
        angle: angle || null,
        format: (format || null) as ContentPiece["format"],
        platform: (platform || null) as ContentPiece["platform"],
        pillar: pillar || null,
        status,
        film_date: filmDate || null,
        publish_date: publishDate || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!piece || !onDelete) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete(piece.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 border border-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 sticky top-0 bg-gray-950 z-10">
          <h2 className="text-base font-semibold text-gray-100">
            {isEdit ? "Edit Piece" : "New Content Piece"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input
              className={inputClass}
              placeholder="Content piece title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Hook */}
          <div>
            <label className={labelClass}>Hook</label>
            <input
              className={inputClass}
              placeholder="Opening hook — grabs attention in first 3 seconds"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
            />
          </div>

          {/* Angle */}
          <div>
            <label className={labelClass}>Angle</label>
            <input
              className={inputClass}
              placeholder="Unique angle / POV"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
            />
          </div>

          {/* Format + Platform row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Format</label>
              <select
                className={inputClass}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="">Select format</option>
                {FORMATS.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Platform</label>
              <select
                className={inputClass}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p === "both" ? "IG + YouTube" : p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={labelClass}>Status</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={clsx(
                    "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all",
                    status === s
                      ? "border-gray-400 bg-gray-700 text-gray-100"
                      : "border-gray-800 bg-gray-900 text-gray-500 hover:border-gray-600 hover:text-gray-300"
                  )}
                >
                  <span className={clsx("w-1.5 h-1.5 rounded-full", STATUS_DOT[s])} />
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Pillar */}
          <div>
            <label className={labelClass}>Pillar</label>
            <input
              className={inputClass}
              placeholder="Content pillar / theme"
              value={pillar}
              onChange={(e) => setPillar(e.target.value)}
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Film Date</label>
              <input
                type="date"
                className={inputClass}
                value={filmDate}
                onChange={(e) => setFilmDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Publish Date</label>
              <input
                type="date"
                className={inputClass}
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800 sticky bottom-0 bg-gray-950">
          {isEdit && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={clsx(
                "flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-colors",
                confirmDelete
                  ? "text-red-300 bg-red-950 border border-red-800 hover:bg-red-900"
                  : "text-gray-500 hover:text-red-400 hover:bg-gray-800"
              )}
            >
              <Trash2 size={13} />
              {confirmDelete ? "Confirm Delete" : "Delete"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-white text-gray-950 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Piece"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
