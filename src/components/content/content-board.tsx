"use client";

import { clsx } from "clsx";
import { Flame } from "lucide-react";
import type { ContentPiece, ContentStatus } from "./types";
import {
  CONTENT_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DOT,
  FORMAT_COLORS,
  FORMAT_LABELS,
  PLATFORM_LABELS,
} from "./types";

interface ContentBoardProps {
  pieces: ContentPiece[];
  onStatusChange: (id: string, status: ContentStatus) => void;
  onEdit: (piece: ContentPiece) => void;
}

function PieceCard({
  piece,
  onEdit,
}: {
  piece: ContentPiece;
  onEdit: (piece: ContentPiece) => void;
}) {
  return (
    <button
      onClick={() => onEdit(piece)}
      className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-lg p-3 transition-all group"
    >
      <p className="text-sm font-medium text-gray-100 line-clamp-2 leading-snug mb-2">
        {piece.title}
      </p>

      <div className="flex flex-wrap gap-1 items-center">
        {piece.format && (
          <span
            className={clsx(
              "text-[10px] font-medium px-1.5 py-0.5 rounded border",
              FORMAT_COLORS[piece.format]
            )}
          >
            {FORMAT_LABELS[piece.format]}
          </span>
        )}
        {piece.platform && (
          <span className="text-[10px] text-gray-500 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded">
            {PLATFORM_LABELS[piece.platform]}
          </span>
        )}
        {piece.viral_score > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-amber-400 ml-auto">
            <Flame size={10} />
            {piece.viral_score.toFixed(1)}
          </span>
        )}
      </div>

      {piece.hook && (
        <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-1 italic">
          &quot;{piece.hook}&quot;
        </p>
      )}
    </button>
  );
}

function BoardColumn({
  status,
  pieces,
  onEdit,
}: {
  status: ContentStatus;
  pieces: ContentPiece[];
  onEdit: (piece: ContentPiece) => void;
}) {
  return (
    <div className="flex-shrink-0 w-[220px] flex flex-col">
      {/* Column Header */}
      <div className="bg-gray-900 rounded-t-lg px-3 py-2.5 border border-gray-800 border-b-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", STATUS_DOT[status])} />
          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
            {STATUS_LABELS[status]}
          </span>
        </div>
        <span
          className={clsx(
            "text-xs font-bold px-1.5 py-0.5 rounded-full border",
            STATUS_COLORS[status]
          )}
        >
          {pieces.length}
        </span>
      </div>

      {/* Column Body */}
      <div className="bg-gray-950 border border-gray-800 rounded-b-lg flex-1 min-h-[400px] p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        {pieces.map((piece) => (
          <PieceCard key={piece.id} piece={piece} onEdit={onEdit} />
        ))}
        {pieces.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-700 text-xs">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

export function ContentBoard({ pieces, onStatusChange: _onStatusChange, onEdit }: ContentBoardProps) {
  const byStatus = Object.fromEntries(
    CONTENT_STATUSES.map((s) => [s, pieces.filter((p) => p.status === s)])
  ) as Record<ContentStatus, ContentPiece[]>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {CONTENT_STATUSES.map((status) => (
        <BoardColumn
          key={status}
          status={status}
          pieces={byStatus[status]}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}
