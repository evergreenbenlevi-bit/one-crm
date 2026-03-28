"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { Task, TaskCategory } from "@/lib/types/tasks";
import { statusLabels, priorityColors, ownerIcons } from "@/lib/types/tasks";
import { saveSessionContext } from "@/lib/session-context";

interface TaskPillarsProps {
  tasks: Task[]; // all non-done, non-backlog tasks
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
}

const PILLARS: { id: TaskCategory; label: string; emoji: string; color: string }[] = [
  { id: "self",    label: "מציאת העצמי",    emoji: "🔵", color: "border-teal-200 dark:border-teal-800" },
  { id: "brand",   label: "פרופיל עסקי",    emoji: "🟣", color: "border-pink-200 dark:border-pink-800" },
  { id: "one_tm",  label: "ONE™",           emoji: "🟠", color: "border-orange-200 dark:border-orange-800" },
];

const PILLAR_HEADER: Record<string, string> = {
  self:   "bg-teal-50 dark:bg-teal-900/20 border-teal-100 dark:border-teal-800",
  brand:  "bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800",
  one_tm: "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800",
};

const NEXT_STATUS: Record<Task["status"], Task["status"] | null> = {
  backlog:     "todo",
  todo:        "in_progress",
  in_progress: "done",
  waiting_ben: "in_progress",
  done:        null,
};

export function TaskPillars({ tasks, onEdit, onStatusChange }: TaskPillarsProps) {
  const [expandedWorkstreams, setExpandedWorkstreams] = useState<Set<string>>(new Set());

  // Group tasks per pillar → workstream
  const pillarData = useMemo(() => {
    return PILLARS.map(pillar => {
      const pillarTasks = tasks.filter(t => t.category === pillar.id);

      // Group by workstream (null → "general")
      const wsMap = new Map<string, Task[]>();
      for (const t of pillarTasks) {
        const ws = t.workstream || "general";
        if (!wsMap.has(ws)) wsMap.set(ws, []);
        wsMap.get(ws)!.push(t);
      }

      // Sort workstreams: has in_progress first, then by task count
      const workstreams = Array.from(wsMap.entries()).sort((a, b) => {
        const aHasActive = a[1].some(t => t.status === "in_progress");
        const bHasActive = b[1].some(t => t.status === "in_progress");
        if (aHasActive && !bHasActive) return -1;
        if (!aHasActive && bHasActive) return 1;
        return b[1].length - a[1].length;
      });

      const hasBlocked = pillarTasks.some(t => t.tags?.includes("#blocked"));
      const activeCount = pillarTasks.filter(t => t.status === "in_progress").length;

      return { ...pillar, workstreams, totalTasks: pillarTasks.length, hasBlocked, activeCount };
    });
  }, [tasks]);

  // Also show temp + research below as a compact section
  const otherTasks = useMemo(() => {
    return tasks.filter(t => t.category === "temp" || t.category === "research");
  }, [tasks]);

  function toggleWorkstream(key: string) {
    setExpandedWorkstreams(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleTaskClick(task: Task) {
    saveSessionContext(task);
    onEdit(task);
  }

  function handleQuickAdvance(e: React.MouseEvent, task: Task) {
    e.stopPropagation();
    const next = NEXT_STATUS[task.status];
    if (next) onStatusChange(task.id, next);
  }

  return (
    <div className="space-y-4">
      {/* 3 Pillar panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pillarData.map(pillar => (
          <div
            key={pillar.id}
            className={clsx(
              "rounded-2xl border bg-white dark:bg-gray-800 shadow-sm overflow-hidden",
              pillar.color
            )}
          >
            {/* Pillar header */}
            <div className={clsx("px-4 py-3 border-b flex items-center justify-between", PILLAR_HEADER[pillar.id])}>
              <div className="flex items-center gap-2">
                <span className="text-base">{pillar.emoji}</span>
                <span className="font-bold text-sm dark:text-gray-100">{pillar.label}</span>
                {pillar.hasBlocked && (
                  <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded-full font-bold">
                    BLOCKED
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {pillar.activeCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                    {pillar.activeCount} פעיל
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">{pillar.totalTasks}</span>
              </div>
            </div>

            {/* Workstreams */}
            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {pillar.totalTasks === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">אין משימות פעילות</p>
              ) : (
                pillar.workstreams.map(([ws, wsTasks]) => {
                  const key = `${pillar.id}-${ws}`;
                  const isExpanded = expandedWorkstreams.has(key);
                  const hasActive = wsTasks.some(t => t.status === "in_progress");

                  return (
                    <div key={ws}>
                      {/* Workstream header */}
                      <button
                        onClick={() => toggleWorkstream(key)}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors text-right"
                      >
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            hasActive ? "bg-amber-400" : "bg-gray-300 dark:bg-gray-600"
                          )} />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            #{ws}
                          </span>
                          {wsTasks.some(t => t.tags?.includes("#blocked")) && (
                            <span className="text-[9px] text-red-500 font-bold">🔴</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {wsTasks.length}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600 text-[10px]">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {/* Tasks list */}
                      {isExpanded && (
                        <div className="border-t border-gray-50 dark:border-gray-700/30">
                          {wsTasks.map((task, i) => (
                            <div
                              key={task.id}
                              onClick={() => handleTaskClick(task)}
                              className={clsx(
                                "flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors",
                                i < wsTasks.length - 1 && "border-b border-gray-50 dark:border-gray-700/30",
                                task.priority === "p1" && "border-r-2 border-red-400"
                              )}
                            >
                              <span className={clsx(
                                "text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0",
                                priorityColors[task.priority]
                              )}>
                                {task.priority.toUpperCase()}
                              </span>
                              <span className="flex-1 text-xs dark:text-gray-200 truncate leading-tight">
                                {task.title}
                              </span>
                              <span className="text-[10px] flex-shrink-0">{ownerIcons[task.owner]}</span>
                              {/* Quick advance button */}
                              {NEXT_STATUS[task.status] && (
                                <button
                                  onClick={(e) => handleQuickAdvance(e, task)}
                                  title={`העבר ל-${statusLabels[NEXT_STATUS[task.status]!]}`}
                                  className="text-[10px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-300 transition-colors flex-shrink-0"
                                >
                                  →
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Compact: Temporary + One-off tasks */}
      {otherTasks.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-700/30">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">זמני / חד-פעמי</span>
            <span className="text-xs text-gray-400">{otherTasks.length}</span>
          </div>
          <div>
            {otherTasks.slice(0, 8).map((task, i) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors",
                  i < Math.min(otherTasks.length, 8) - 1 && "border-b border-gray-50 dark:border-gray-700/30"
                )}
              >
                <span className={clsx("text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0", priorityColors[task.priority])}>
                  {task.priority.toUpperCase()}
                </span>
                <span className="flex-1 text-xs dark:text-gray-200 truncate">{task.title}</span>
                <span className="text-[10px] text-gray-400">{task.category === "temp" ? "זמני" : "חד-פעמי"}</span>
                <span className="text-[10px]">{ownerIcons[task.owner]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
