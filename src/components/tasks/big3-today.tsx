"use client";

import { useState, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import type { Big3Project, Big3Task } from "@/lib/types/big3";
import { projectTypeEmoji } from "@/lib/types/big3";
import { Target, Clock, AlertTriangle } from "lucide-react";

const MAX_DAILY_MINUTES = 150;

interface Big3TodayProps {
  className?: string;
}

export function Big3Today({ className }: Big3TodayProps) {
  const [projects, setProjects] = useState<Big3Project[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());

  const fetchBig3 = useCallback(async () => {
    try {
      const res = await fetch("/api/big3/week");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data.projects ?? []);
      setWeekStart(data.week_start ?? "");
    } catch {
      // Silently fail — BIG 3 is optional enhancement
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBig3(); }, [fetchBig3]);

  async function toggleTask(task: Big3Task) {
    if (pendingTasks.has(task.id)) return;

    // Optimistic update
    setPendingTasks(prev => new Set([...prev, task.id]));
    const newCompleted = !task.completed;

    setProjects(prev =>
      prev.map(p => ({
        ...p,
        tasks: p.tasks?.map(t =>
          t.id === task.id ? { ...t, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null } : t
        ),
      }))
    );

    try {
      const res = await fetch(`/api/big3/tasks/${task.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: newCompleted }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Rollback
      setProjects(prev =>
        prev.map(p => ({
          ...p,
          tasks: p.tasks?.map(t =>
            t.id === task.id ? { ...t, completed: task.completed, completed_at: task.completed_at } : t
          ),
        }))
      );
    } finally {
      setPendingTasks(prev => { const next = new Set(prev); next.delete(task.id); return next; });
    }
  }

  // Format week label: "22-28 מרץ"
  function formatWeekLabel(weekStartDate: string): string {
    if (!weekStartDate) return "";
    const start = new Date(weekStartDate);
    const end = new Date(weekStartDate);
    end.setDate(end.getDate() + 6);

    const heMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    return `${start.getDate()}-${end.getDate()} ${heMonths[end.getMonth()]}`;
  }

  // Total scheduled minutes for today
  const today = new Date().toISOString().split("T")[0];
  const todayTasks = projects.flatMap(p =>
    (p.tasks ?? []).filter(t => !t.scheduled_date || t.scheduled_date === today)
  );
  const totalMinutes = todayTasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);
  const completedMinutes = todayTasks.filter(t => t.completed).reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);
  const overLimit = totalMinutes > MAX_DAILY_MINUTES;

  // Calculate progress per project
  function getProgress(project: Big3Project): { done: number; total: number } {
    const tasks = project.tasks ?? [];
    const todayProjectTasks = tasks.filter(t => !t.scheduled_date || t.scheduled_date === today);
    return {
      done: todayProjectTasks.filter(t => t.completed).length,
      total: todayProjectTasks.length,
    };
  }

  if (loading) {
    return (
      <div className={clsx("animate-pulse bg-white dark:bg-gray-800 rounded-2xl h-24 border border-gray-100 dark:border-gray-700", className)} />
    );
  }

  if (projects.length === 0) return null;

  // Sort: needle_mover first, then others by position
  const sorted = [...projects].sort((a, b) => {
    if (a.type === "needle_mover" && b.type !== "needle_mover") return -1;
    if (b.type === "needle_mover" && a.type !== "needle_mover") return 1;
    return a.position - b.position;
  });

  return (
    <div className={clsx("bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-bold dark:text-gray-100">BIG 3</span>
          {weekStart && (
            <span className="text-xs text-gray-400 dark:text-gray-500">— שבוע {formatWeekLabel(weekStart)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {overLimit && (
            <div className="flex items-center gap-1 text-amber-500">
              <AlertTriangle size={12} />
              <span className="text-[10px] font-semibold">מעל 150 דק'</span>
            </div>
          )}
          <div className={clsx("flex items-center gap-1 text-xs font-medium", overLimit ? "text-amber-500" : "text-gray-400 dark:text-gray-500")}>
            <Clock size={11} />
            <span>
              {completedMinutes > 0 ? `${completedMinutes}/` : ""}
              {totalMinutes > 0 ? `~${totalMinutes}` : "0"}דק'
            </span>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
        {sorted.map((project) => {
          const progress = getProgress(project);
          const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
          const todayProjectTasks = (project.tasks ?? []).filter(t => !t.scheduled_date || t.scheduled_date === today);

          return (
            <div key={project.id} className="px-4 py-3">
              {/* Project header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{projectTypeEmoji[project.type]}</span>
                <span className="text-sm font-semibold dark:text-gray-100 flex-1 truncate">{project.name}</span>
                {progress.total > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {progress.done}/{progress.total}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {progress.total > 0 && (
                <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full mb-2.5 overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-300",
                      progressPct === 100 ? "bg-green-500" : project.type === "needle_mover" ? "bg-red-500" : "bg-yellow-400"
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Tasks */}
              {todayProjectTasks.length > 0 && (
                <div className="space-y-1.5">
                  {todayProjectTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => toggleTask(task)}
                      disabled={pendingTasks.has(task.id)}
                      className={clsx(
                        "w-full flex items-center gap-2.5 text-right transition-opacity",
                        pendingTasks.has(task.id) && "opacity-50"
                      )}
                    >
                      {/* Checkbox */}
                      <span className={clsx(
                        "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        task.completed
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 dark:border-gray-600 hover:border-brand-400"
                      )}>
                        {task.completed && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>

                      <span className={clsx(
                        "flex-1 text-xs text-right",
                        task.completed ? "line-through text-gray-400 dark:text-gray-600" : "text-gray-700 dark:text-gray-300"
                      )}>
                        {task.title}
                      </span>

                      {task.estimated_minutes && (
                        <span className="flex-shrink-0 text-[10px] text-gray-400 dark:text-gray-600">
                          ~{task.estimated_minutes}דק'
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {todayProjectTasks.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-600 pr-6">אין משימות מתוכננות להיום</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
