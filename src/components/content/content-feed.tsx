"use client";

import { clsx } from "clsx";
import { Flame, Eye, Bookmark, Share2, MessageCircle } from "lucide-react";
import type { ContentPiece } from "./types";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_DOT,
  FORMAT_COLORS,
  FORMAT_LABELS,
  PLATFORM_LABELS,
} from "./types";

interface ContentFeedProps {
  pieces: ContentPiece[];
  onEdit: (piece: ContentPiece) => void;
}

function FeedCard({ piece, onEdit }: { piece: ContentPiece; onEdit: (p: ContentPiece) => void }) {
  const hasMetrics = piece.views > 0 || piece.saves > 0 || piece.shares > 0 || piece.comments > 0;

  return (
    <button
      onClick={() => onEdit(piece)}
      className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all group"
    >
      {/* Status + badges row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span
          className={clsx(
            "flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            STATUS_COLORS[piece.status]
          )}
        >
          <span className={clsx("w-1.5 h-1.5 rounded-full", STATUS_DOT[piece.status])} />
          {STATUS_LABELS[piece.status]}
        </span>

        {piece.format && (
          <span className={clsx("text-[10px] font-medium px-1.5 py-0.5 rounded border", FORMAT_COLORS[piece.format])}>
            {FORMAT_LABELS[piece.format]}
          </span>
        )}

        {piece.platform && (
          <span className="text-[10px] text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
            {PLATFORM_LABELS[piece.platform]}
          </span>
        )}

        {piece.viral_score > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 ml-auto font-semibold">
            <Flame size={10} />
            {piece.viral_score.toFixed(1)}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-100 leading-snug mb-1">
        {piece.title}
      </h3>

      {/* Hook */}
      {piece.hook && (
        <p className="text-xs text-gray-500 line-clamp-2 italic mb-3">
          &quot;{piece.hook}&quot;
        </p>
      )}

      {/* Dates */}
      {(piece.film_date || piece.publish_date) && (
        <div className="flex gap-3 mb-3">
          {piece.film_date && (
            <span className="text-[10px] text-blue-400">
              Film: {piece.film_date}
            </span>
          )}
          {piece.publish_date && (
            <span className="text-[10px] text-emerald-400">
              Publish: {piece.publish_date}
            </span>
          )}
        </div>
      )}

      {/* Metrics */}
      {hasMetrics && (
        <div className="flex gap-3 pt-2 border-t border-gray-800">
          {piece.views > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <Eye size={10} />
              {piece.views.toLocaleString()}
            </span>
          )}
          {piece.saves > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <Bookmark size={10} />
              {piece.saves.toLocaleString()}
            </span>
          )}
          {piece.shares > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <Share2 size={10} />
              {piece.shares.toLocaleString()}
            </span>
          )}
          {piece.comments > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-gray-500">
              <MessageCircle size={10} />
              {piece.comments.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export function ContentFeed({ pieces, onEdit }: ContentFeedProps) {
  if (pieces.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-600 text-sm">
        No content pieces yet
      </div>
    );
  }

  return (
    <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 space-y-4">
      {pieces.map((piece) => (
        <div key={piece.id} className="break-inside-avoid mb-4">
          <FeedCard piece={piece} onEdit={onEdit} />
        </div>
      ))}
    </div>
  );
}
