"use client";

import { useState } from "react";
import { X, Trash2, ArrowUp, ArrowDown, CheckCircle2, RotateCcw } from "lucide-react";
import { clsx } from "clsx";
import type { TaskPriority, TaskStatus } from "@/lib/types/tasks";

interface BulkActionBarProps {
  selectedCount: number;
  onChangePriority: (priority: TaskPriority) => void;
  onChangeStatus: (status: TaskStatus) => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkActionBar({ selectedCount, onChangePriority, onChangeStatus, onDelete, onClear }: BulkActionBarProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl shadow-2xl border border-gray-700 dark:border-gray-300">
        {/* Count */}
        <span className="text-sm font-bold px-2 py-0.5 bg-brand-600 dark:bg-brand-500 text-white rounded-lg flex-shrink-0">
          {selectedCount}
        </span>
        <span className="text-sm text-gray-300 dark:text-gray-600 flex-shrink-0">נבחרו</span>

        <div className="w-px h-5 bg-gray-700 dark:bg-gray-300 mx-1" />

        {/* Priority buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangePriority("p1")}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-red-500/20 text-red-300 dark:bg-red-100 dark:text-red-700 hover:bg-red-500/40 dark:hover:bg-red-200 transition-colors"
          >
            P1
          </button>
          <button
            onClick={() => onChangePriority("p2")}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-yellow-500/20 text-yellow-300 dark:bg-yellow-100 dark:text-yellow-700 hover:bg-yellow-500/40 dark:hover:bg-yellow-200 transition-colors"
          >
            P2
          </button>
          <button
            onClick={() => onChangePriority("p3")}
            className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-gray-500/20 text-gray-300 dark:bg-gray-200 dark:text-gray-600 hover:bg-gray-500/40 dark:hover:bg-gray-300 transition-colors"
          >
            P3
          </button>
        </div>

        <div className="w-px h-5 bg-gray-700 dark:bg-gray-300 mx-1" />

        {/* Status buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeStatus("todo")}
            title="העבר ל-Todo"
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-500/20 text-blue-300 dark:bg-blue-100 dark:text-blue-700 hover:bg-blue-500/40 dark:hover:bg-blue-200 transition-colors"
          >
            Todo
          </button>
          <button
            onClick={() => onChangeStatus("in_progress")}
            title="העבר לביצוע"
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-300 dark:bg-amber-100 dark:text-amber-700 hover:bg-amber-500/40 dark:hover:bg-amber-200 transition-colors"
          >
            בביצוע
          </button>
          <button
            onClick={() => onChangeStatus("done")}
            title="סמן כהושלם"
            className="p-1.5 rounded-lg bg-green-500/20 text-green-300 dark:bg-green-100 dark:text-green-700 hover:bg-green-500/40 dark:hover:bg-green-200 transition-colors"
          >
            <CheckCircle2 size={14} />
          </button>
          <button
            onClick={() => onChangeStatus("backlog")}
            title="החזר ל-Backlog"
            className="p-1.5 rounded-lg bg-gray-500/20 text-gray-400 dark:bg-gray-200 dark:text-gray-500 hover:bg-gray-500/40 dark:hover:bg-gray-300 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="w-px h-5 bg-gray-700 dark:bg-gray-300 mx-1" />

        {/* Delete */}
        {showConfirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { onDelete(); setShowConfirmDelete(false); }}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              אישור מחיקה
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="px-2 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 transition-colors"
            >
              ביטול
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirmDelete(true)}
            title="מחק נבחרים"
            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 dark:bg-red-100 dark:text-red-600 hover:bg-red-500/40 dark:hover:bg-red-200 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}

        <div className="w-px h-5 bg-gray-700 dark:bg-gray-300 mx-1" />

        {/* Clear selection */}
        <button
          onClick={onClear}
          title="נקה בחירה"
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-white dark:hover:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
