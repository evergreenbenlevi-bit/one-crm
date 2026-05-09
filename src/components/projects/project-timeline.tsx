"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import type { Task } from "@/lib/types/tasks";
import { priorityColors } from "@/lib/types/tasks";

const DAY_MS = 86_400_000;

function toDay(dateStr: string) {
  return Math.floor(new Date(dateStr).getTime() / DAY_MS);
}

export function ProjectTimeline({ tasks }: { tasks: Task[] }) {
  const withDate = useMemo(
    () => tasks.filter((t) => t.due_date && t.status !== "done").sort((a, b) => a.due_date!.localeCompare(b.due_date!)),
    [tasks]
  );
  const withoutDate = useMemo(
    () => tasks.filter((t) => !t.due_date && t.status !== "done"),
    [tasks]
  );

  const { minDay, totalSpan } = useMemo(() => {
    if (withDate.length === 0) return { minDay: toDay(new Date().toISOString().split("T")[0]), totalSpan: 14 };
    const days = withDate.map((t) => toDay(t.due_date!));
    const today = toDay(new Date().toISOString().split("T")[0]);
    const min = Math.min(today, ...days);
    const max = Math.max(...days);
    return { minDay: min, totalSpan: Math.max(max - min, 7) };
  }, [withDate]);

  if (tasks.filter((t) => t.status !== "done").length === 0) {
    return (
      <div className="text-center py-16 text-gray-500 text-sm">אין משימות פעילות בפרויקט</div>
    );
  }

  const todayPct = ((toDay(new Date().toISOString().split("T")[0]) - minDay) / totalSpan) * 100;

  return (
    <div className="space-y-1 relative pt-8 pb-4">
      {/* Header: week labels */}
      <div className="relative h-6 mb-2 border-b border-gray-700/50">
        {Array.from({ length: Math.ceil(totalSpan / 7) + 1 }, (_, i) => {
          const dayOffset = i * 7;
          const pct = (dayOffset / totalSpan) * 100;
          if (pct > 100) return null;
          const date = new Date((minDay + dayOffset) * DAY_MS);
          return (
            <span
              key={i}
              className="absolute text-[9px] text-gray-500 -translate-x-1/2"
              style={{ left: `${pct}%` }}
            >
              {date.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" })}
            </span>
          );
        })}
      </div>

      {/* Today line */}
      {todayPct >= 0 && todayPct <= 100 && (
        <div
          className="absolute top-0 bottom-0 w-px bg-blue-500/60 z-10 pointer-events-none"
          style={{ left: `calc(${todayPct}% )`, top: "2rem" }}
        />
      )}

      {/* Task rows with due_date */}
      {withDate.map((task) => {
        const dayPos = toDay(task.due_date!);
        const endPct = Math.min(((dayPos - minDay) / totalSpan) * 100, 100);
        const barWidthPct = task.estimated_minutes
          ? Math.min(Math.max((task.estimated_minutes / (totalSpan * 8 * 60)) * 100, 2), 15)
          : 3;
        const leftPct = Math.max(endPct - barWidthPct, 0);
        const isOverdue = task.due_date! < new Date().toISOString().split("T")[0];

        return (
          <div key={task.id} className="flex items-center gap-3 group">
            <div className="w-36 flex-shrink-0 truncate text-[11px] text-gray-300 text-right" title={task.title}>
              <span className={clsx("inline-block text-[9px] font-bold px-1 py-0.5 rounded mr-1", priorityColors[task.priority])}>
                {task.priority.toUpperCase()}
              </span>
              {task.title}
            </div>
            <div className="flex-1 relative h-5 rounded-md overflow-hidden bg-gray-800/40">
              <div
                className={clsx(
                  "absolute h-full rounded-md transition-all",
                  isOverdue ? "bg-red-600/70" : "bg-brand-600/70"
                )}
                style={{ left: `${leftPct}%`, width: `${barWidthPct}%` }}
                title={`${task.due_date}${task.estimated_minutes ? ` · ${task.estimated_minutes} דק׳` : ""}`}
              />
              <div
                className={clsx("absolute top-0 bottom-0 w-0.5", isOverdue ? "bg-red-400" : "bg-brand-400")}
                style={{ left: `${endPct}%` }}
              />
            </div>
            <div className={clsx("w-20 flex-shrink-0 text-[10px]", isOverdue ? "text-red-400" : "text-gray-500")}>
              {task.due_date}
            </div>
          </div>
        );
      })}

      {/* Tasks without deadline */}
      {withoutDate.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <p className="text-[10px] text-gray-600 mb-2">ללא תאריך — הוסף דדליין כדי לראות בציר זמן</p>
          <div className="flex flex-wrap gap-1.5">
            {withoutDate.map((task) => (
              <span key={task.id} className={clsx("text-[10px] px-2 py-1 rounded-md", priorityColors[task.priority])}>
                {task.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
