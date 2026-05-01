"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { CheckCircle2, Circle } from "lucide-react";

interface SubtaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface TaskSubtaskPreviewProps {
  taskId: string;
  isOpen: boolean;
}

export function TaskSubtaskPreview({ taskId, isOpen }: TaskSubtaskPreviewProps) {
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!isOpen || fetched) return;
    setLoading(true);
    fetch(`/api/tasks/${taskId}/subtasks`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setSubtasks(data);
        setFetched(true);
      })
      .catch(() => setFetched(true))
      .finally(() => setLoading(false));
  }, [isOpen, taskId, fetched]);

  const toggleSubtask = async (e: React.MouseEvent, sub: SubtaskItem) => {
    e.stopPropagation();
    const newStatus = sub.status === "done" ? "open" : "done";

    // Optimistic update
    setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));

    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sub.id, status: newStatus }),
    }).catch(() => {
      // Revert on failure
      setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, status: sub.status } : s));
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="mt-2 pt-2 border-t border-white/5 space-y-1.5"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {loading && (
        <div className="space-y-1.5">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="w-3.5 h-3.5 rounded-full bg-gray-700 shrink-0" />
              <div className="h-3 bg-gray-700 rounded flex-1" style={{ width: `${60 + i * 15}%` }} />
            </div>
          ))}
        </div>
      )}

      {!loading && subtasks.length === 0 && (
        <p className="text-xs text-gray-700 text-right" dir="rtl">אין תת-משימות</p>
      )}

      {!loading && subtasks.map(sub => {
        const isDone = sub.status === "done";
        return (
          <button
            key={sub.id}
            onClick={(e) => toggleSubtask(e, sub)}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-2 w-full group/sub text-right hover:bg-white/3 rounded-lg px-1 py-0.5 transition-colors"
            dir="rtl"
          >
            {isDone
              ? <CheckCircle2 size={13} className="text-green-500 shrink-0" />
              : <Circle size={13} className="text-gray-600 group-hover/sub:text-gray-400 shrink-0 transition-colors" />
            }
            <span className={clsx(
              "text-xs flex-1 text-right leading-tight",
              isDone ? "line-through text-gray-600" : "text-gray-400"
            )}>
              {sub.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
