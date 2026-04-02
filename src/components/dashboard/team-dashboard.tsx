"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CheckSquare, Clock, AlertCircle, TrendingUp, FolderKanban } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import type { Task } from "@/lib/types/tasks";
import { statusLabels, priorityColors, ownerIcons, categoryLabels, categoryColors } from "@/lib/types/tasks";

interface ProjectSummary {
  id: string;
  title: string;
  category: string;
  priority: string;
  total: number;
  done: number;
  inProgress: number;
  pct: number;
}

export function TeamDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks?exclude_backlog=1&limit=100");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Stats
  const stats = useMemo(() => {
    const open = tasks.filter(t => t.status !== "done");
    const done = tasks.filter(t => t.status === "done");
    const inProgress = tasks.filter(t => t.status === "in_progress");
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "done");
    const doneThisWeek = done.filter(t => {
      if (!t.completed_at) return false;
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.completed_at) > weekAgo;
    });
    return { open: open.length, done: done.length, inProgress: inProgress.length, overdue: overdue.length, doneThisWeek: doneThisWeek.length, total: tasks.length };
  }, [tasks]);

  // Projects with progress
  const projects = useMemo(() => {
    const childMap = new Map<string, Task[]>();
    const parentIds = new Set<string>();
    tasks.forEach(t => {
      if (t.parent_id) {
        parentIds.add(t.parent_id);
        const children = childMap.get(t.parent_id) || [];
        children.push(t);
        childMap.set(t.parent_id, children);
      }
    });

    const list: ProjectSummary[] = [];
    tasks.forEach(t => {
      if (parentIds.has(t.id)) {
        const subtasks = childMap.get(t.id) || [];
        const done = subtasks.filter(s => s.status === "done").length;
        const inProgress = subtasks.filter(s => s.status === "in_progress").length;
        const total = subtasks.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        list.push({ id: t.id, title: t.title, category: t.category, priority: t.priority, total, done, inProgress, pct });
      }
    });

    list.sort((a, b) => {
      if (a.pct === 100 && b.pct !== 100) return 1;
      if (a.pct !== 100 && b.pct === 100) return -1;
      const pOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2 };
      return (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
    });

    return list;
  }, [tasks]);

  // Active tasks (not done, sorted by priority)
  const activeTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== "done" && !tasks.some(p => p.id === t.parent_id && tasks.some(c => c.parent_id === p.id)))
      .filter(t => t.status === "in_progress" || t.status === "todo" || t.status === "waiting_ben")
      .sort((a, b) => {
        const pOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2 };
        const statusOrder: Record<string, number> = { in_progress: 0, waiting_ben: 1, todo: 2 };
        return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3) || (pOrder[a.priority] || 1) - (pOrder[b.priority] || 1);
      })
      .slice(0, 10);
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
          טוען...
        </div>
      </div>
    );
  }

  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold dark:text-gray-100">שלום 👋</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          הנה הסטטוס שלך היום
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={CheckSquare} label="פתוחות" value={stats.open} color="text-blue-600 dark:text-blue-400" bg="bg-blue-50 dark:bg-blue-900/20" />
        <StatCard icon={Clock} label="בביצוע" value={stats.inProgress} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-900/20" />
        <StatCard icon={TrendingUp} label="הושלמו השבוע" value={stats.doneThisWeek} color="text-green-600 dark:text-green-400" bg="bg-green-50 dark:bg-green-900/20" />
        <StatCard icon={AlertCircle} label="באיחור" value={stats.overdue} color="text-red-600 dark:text-red-400" bg="bg-red-50 dark:bg-red-900/20" />
      </div>

      {/* Overall Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold dark:text-gray-200">התקדמות כללית</h2>
          <span className="text-lg font-bold text-brand-600">{completionPct}%</span>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              completionPct === 100 ? "bg-green-500" : completionPct > 60 ? "bg-brand-500" : completionPct > 30 ? "bg-amber-500" : "bg-red-500"
            )}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{stats.done} מתוך {stats.total} משימות הושלמו</p>
      </div>

      {/* Projects with Progress */}
      {projects.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold dark:text-gray-100">פרויקטים</h2>
            <Link href="/projects" className="text-xs text-brand-600 hover:underline">הצג הכל</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.slice(0, 6).map(project => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={clsx(
                  "bg-white dark:bg-gray-800 rounded-xl p-4 border transition-all hover:shadow-md",
                  project.pct === 100 ? "border-green-200 dark:border-green-800 opacity-60" : "border-gray-100 dark:border-gray-700"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FolderKanban size={14} className="text-gray-400" />
                    <h3 className="text-sm font-bold dark:text-gray-200 truncate">{project.title}</h3>
                  </div>
                  <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", categoryColors[project.category as keyof typeof categoryColors] || "bg-gray-100 text-gray-500")}>
                    {categoryLabels[project.category as keyof typeof categoryLabels] || project.category}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                  <span>{project.done}/{project.total} משימות</span>
                  <span className="font-bold">{project.pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      project.pct === 100 ? "bg-green-500" : project.pct > 50 ? "bg-brand-500" : "bg-amber-500"
                    )}
                    style={{ width: `${project.pct}%` }}
                  />
                </div>

                <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                  {project.inProgress > 0 && `${project.inProgress} בביצוע`}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Tasks */}
      {activeTasks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold dark:text-gray-100">משימות פעילות</h2>
            <Link href="/tasks" className="text-xs text-brand-600 hover:underline">הצג הכל</Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {activeTasks.map((task, i) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date();
              return (
                <div key={task.id} className={clsx("flex items-center gap-3 px-4 py-3", i < activeTasks.length - 1 && "border-b border-gray-50 dark:border-gray-700/50")}>
                  <StatusDot status={task.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm dark:text-gray-200 truncate">
                      {isOverdue && "🔴 "}{task.title}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">
                      {statusLabels[task.status]} · {ownerIcons[task.owner]}
                    </p>
                  </div>
                  <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0", priorityColors[task.priority])}>
                    {task.priority.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: number; color: string; bg: string }) {
  return (
    <div className={clsx("rounded-xl p-4 border border-gray-100 dark:border-gray-700", bg)}>
      <Icon size={18} className={clsx("mb-2", color)} />
      <p className={clsx("text-2xl font-bold", color)}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    in_progress: "bg-amber-500",
    todo: "bg-blue-500",
    waiting_ben: "bg-purple-500",
    backlog: "bg-gray-400",
  };
  return <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", colors[status] || "bg-gray-400")} />;
}
