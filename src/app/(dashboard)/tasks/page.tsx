"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Upload, AlertCircle, Sun, CalendarDays, Archive, Zap } from "lucide-react";
import type { Task, TaskStatus, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import { TASK_STATUSES, statusLabels, priorityColors, ownerIcons, categoryLabels, categoryColors } from "@/lib/types/tasks";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskAddModal } from "@/components/tasks/task-add-modal";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { TaskImportModal } from "@/components/tasks/task-import-modal";
import { clsx } from "clsx";

type ViewMode = "today" | "week" | "backlog";
type QueueMode = "claude" | "ben" | "all";

const QUEUE_TABS: { id: QueueMode; label: string; icon: string }[] = [
  { id: "claude", label: "Claude", icon: "🤖" },
  { id: "ben", label: "Ben", icon: "🙋" },
  { id: "all", label: "הכל", icon: "👥" },
];

const WIP_LIMIT = 5;

const STATUS_BADGE: Record<TaskStatus, string> = {
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  waiting_ben: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  todo: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  backlog: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [queueMode, setQueueMode] = useState<QueueMode>("claude");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<TaskCategory>>(new Set());

  const pendingOps = useRef(new Set<string>());

  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">("all");
  const [filterOwner, setFilterOwner] = useState<TaskOwner | "all">("all");

  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("שגיאה בטעינת משימות. נסה לרענן.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Queue filter — base for all views
  const queueFiltered = useMemo(() => {
    return tasks.filter(t => {
      if (queueMode === "claude") return t.owner === "claude" || t.owner === "both";
      if (queueMode === "ben") return t.owner === "ben" || t.owner === "both";
      return true;
    });
  }, [tasks, queueMode]);

  // TODAY: in_progress + waiting_ben + p1 todos, max 10
  const todayTasks = useMemo(() => {
    const active = queueFiltered.filter(t => {
      if (t.status === "done" || t.status === "backlog") return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return t.status === "in_progress" || t.status === "waiting_ben" || (t.status === "todo" && t.priority === "p1");
    });
    const statusOrder: Record<TaskStatus, number> = { in_progress: 0, waiting_ben: 1, todo: 2, backlog: 3, done: 4 };
    const priorityOrder = { p1: 0, p2: 1, p3: 2 };
    active.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || priorityOrder[a.priority] - priorityOrder[b.priority]);
    return active.slice(0, 10);
  }, [queueFiltered, filterCategory, filterPriority]);

  // WEEK: kanban without backlog
  const weekTasks = useMemo(() => {
    return queueFiltered.filter(t => {
      if (t.status === "backlog") return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (queueMode === "all" && filterOwner !== "all" && t.owner !== filterOwner) return false;
      return true;
    });
  }, [queueFiltered, filterCategory, filterPriority, filterOwner, queueMode]);

  // BACKLOG: backlog status only
  const backlogTasks = useMemo(() => {
    return queueFiltered.filter(t => {
      if (t.status !== "backlog") return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [queueFiltered, filterCategory, filterPriority]);

  // Kanban columns for week view
  const weekColumns = useMemo(() => {
    const cols: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], waiting_ben: [], done: [] };
    weekTasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });
    const priorityOrder = { p1: 0, p2: 1, p3: 2 };
    Object.values(cols).forEach(arr => arr.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.position - b.position));
    return cols;
  }, [weekTasks]);

  // Backlog grouped by category
  const backlogByCategory = useMemo(() => {
    const groups = {} as Record<TaskCategory, Task[]>;
    const cats: TaskCategory[] = ["one_tm", "infrastructure", "personal", "research", "content"];
    cats.forEach(c => { groups[c] = []; });
    backlogTasks.forEach(t => { if (groups[t.category]) groups[t.category].push(t); });
    const priorityOrder = { p1: 0, p2: 1, p3: 2 };
    (Object.keys(groups) as TaskCategory[]).forEach(c => groups[c].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]));
    return groups;
  }, [backlogTasks]);

  const wipCount = useMemo(() => queueFiltered.filter(t => t.status === "in_progress").length, [queueFiltered]);

  const stats = useMemo(() => {
    const open = queueFiltered.filter(t => t.status !== "done");
    return {
      total: open.length,
      p1: open.filter(t => t.priority === "p1").length,
      inProgress: queueFiltered.filter(t => t.status === "in_progress").length,
      backlog: queueFiltered.filter(t => t.status === "backlog").length,
    };
  }, [queueFiltered]);

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    // WIP limit enforcement
    if (newStatus === "in_progress") {
      const current = tasks.find(t => t.id === taskId);
      if (current?.status !== "in_progress" && wipCount >= WIP_LIMIT) {
        setError(`מגבלת WIP: מקסימום ${WIP_LIMIT} משימות בביצוע. סיים אחת לפני שמתחיל חדשה.`);
        return;
      }
    }

    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);

    const previousTasks = tasks;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(previousTasks);
      setError("שגיאה בעדכון סטטוס");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }

  async function handleAddTask(taskData: {
    title: string; description: string; priority: TaskPriority;
    status: TaskStatus; owner: TaskOwner; category: TaskCategory; due_date: string | null;
  }) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskData, position: 0 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "שגיאה ביצירת משימה");
      }
      const task = await res.json();
      setTasks(prev => [task, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת משימה");
    }
  }

  async function handleEditTask(task: Task) {
    if (pendingOps.current.has(task.id)) return;
    pendingOps.current.add(task.id);

    const previousTasks = tasks;
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id, title: task.title, description: task.description,
          priority: task.priority, status: task.status, owner: task.owner,
          category: task.category, due_date: task.due_date,
        }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(previousTasks);
      setError("שגיאה בעדכון משימה");
    } finally {
      pendingOps.current.delete(task.id);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);

    const previousTasks = tasks;
    setTasks(prev => prev.filter(t => t.id !== taskId));

    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setTasks(previousTasks);
      setError("שגיאה במחיקת משימה");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }

  function toggleCategory(cat: TaskCategory) {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
          טוען משימות...
        </div>
      </div>
    );
  }

  const weekVisibleStatuses: TaskStatus[] = ["todo", "in_progress", "waiting_ben", "done"];

  return (
    <div className="space-y-4">
      {/* Error Toast */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 animate-in fade-in">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="mr-auto text-red-400 hover:text-red-600 dark:hover:text-red-200">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">משימות</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {stats.total} פתוחות
            {stats.p1 > 0 && <span className="text-red-500 font-semibold"> · {stats.p1} P1</span>}
            <span className={clsx(" font-medium", wipCount >= WIP_LIMIT ? "text-amber-500" : "")}>
              {" "}· {stats.inProgress}/{WIP_LIMIT} WIP
            </span>
            <span className="text-gray-400"> · {stats.backlog} backlog</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
          >
            <Upload size={14} />
            ייבוא
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            משימה חדשה
          </button>
        </div>
      </div>

      {/* Queue Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl w-fit">
        {QUEUE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setQueueMode(tab.id)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
              queueMode === tab.id
                ? "bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={clsx(
              "text-xs px-1.5 py-0.5 rounded-full font-bold",
              queueMode === tab.id
                ? "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300"
                : "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
            )}>
              {tasks.filter(t => {
                const open = t.status !== "done";
                if (tab.id === "claude") return open && (t.owner === "claude" || t.owner === "both");
                if (tab.id === "ben") return open && (t.owner === "ben" || t.owner === "both");
                return open;
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* View Tabs — Today / Week / Backlog */}
      <div className="flex items-center gap-0 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setViewMode("today")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all",
            viewMode === "today"
              ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          <Sun size={14} />
          היום
          <span className={clsx(
            "text-xs px-1.5 py-0.5 rounded-full",
            viewMode === "today" ? "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          )}>
            {todayTasks.length}
          </span>
        </button>

        <button
          onClick={() => setViewMode("week")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all",
            viewMode === "week"
              ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          <CalendarDays size={14} />
          השבוע
          <span className={clsx(
            "text-xs px-1.5 py-0.5 rounded-full",
            viewMode === "week" ? "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          )}>
            {weekTasks.length}
          </span>
        </button>

        <button
          onClick={() => setViewMode("backlog")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all",
            viewMode === "backlog"
              ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
              : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          <Archive size={14} />
          Backlog
          <span className={clsx(
            "text-xs px-1.5 py-0.5 rounded-full",
            viewMode === "backlog" ? "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          )}>
            {backlogTasks.length}
          </span>
        </button>
      </div>

      {/* Secondary Filters */}
      <div className="flex items-center gap-2">
        <TaskFilters
          priority={filterPriority}
          owner={queueMode === "all" ? filterOwner : "all"}
          category={filterCategory}
          onPriorityChange={setFilterPriority}
          onOwnerChange={queueMode === "all" ? setFilterOwner : () => {}}
          onCategoryChange={setFilterCategory}
          hideOwner={queueMode !== "all"}
        />
      </div>

      {/* ── TODAY VIEW ── */}
      {viewMode === "today" && (
        <div className="space-y-3">
          {wipCount >= WIP_LIMIT && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-300">
              <Zap size={14} className="flex-shrink-0" />
              <span>WIP limit: {wipCount}/{WIP_LIMIT} משימות בביצוע. סיים אחת לפני שמתחיל חדשה.</span>
            </div>
          )}

          {todayTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Sun size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">אין משימות פעילות להיום</p>
              <p className="text-xs mt-1 opacity-70">העבר משימות מה-Backlog ל-Todo כדי להתחיל</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {todayTasks.map((task, i) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                return (
                  <div
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50",
                      i < todayTasks.length - 1 && "border-b border-gray-50 dark:border-gray-700/50",
                      task.priority === "p1" && "border-r-4 border-red-500"
                    )}
                  >
                    <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0", priorityColors[task.priority])}>
                      {task.priority.toUpperCase()}
                    </span>
                    <span className="flex-1 text-sm font-medium dark:text-gray-200 truncate">
                      {isOverdue && "🔴 "}{task.title}
                    </span>
                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0", categoryColors[task.category])}>
                      {categoryLabels[task.category]}
                    </span>
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0", STATUS_BADGE[task.status])}>
                      {statusLabels[task.status]}
                    </span>
                    <span className="text-sm flex-shrink-0">{ownerIcons[task.owner]}</span>
                  </div>
                );
              })}
            </div>
          )}

          {todayTasks.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {todayTasks.length} פעילות עכשיו · {stats.backlog} ממתינות בbacklog
            </p>
          )}
        </div>
      )}

      {/* ── WEEK VIEW (Kanban) ── */}
      {viewMode === "week" && (
        <TaskKanban
          columns={weekColumns}
          onStatusChange={handleStatusChange}
          onEdit={setEditingTask}
          visibleStatuses={weekVisibleStatuses}
        />
      )}

      {/* ── BACKLOG VIEW ── */}
      {viewMode === "backlog" && (
        <div className="space-y-2">
          {backlogTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Archive size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">הBacklog ריק</p>
            </div>
          ) : (
            (["one_tm", "infrastructure", "personal", "research", "content"] as TaskCategory[])
              .filter(cat => backlogByCategory[cat]?.length > 0)
              .map(cat => {
                const isExpanded = expandedCategories.has(cat);
                const catTasks = backlogByCategory[cat];
                return (
                  <div key={cat} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", categoryColors[cat])}>
                          {categoryLabels[cat]}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{catTasks.length} משימות</span>
                        {catTasks.filter(t => t.priority === "p1").length > 0 && (
                          <span className="text-[10px] text-red-500 font-bold">
                            {catTasks.filter(t => t.priority === "p1").length} P1
                          </span>
                        )}
                      </div>
                      <span className="text-gray-300 dark:text-gray-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-50 dark:border-gray-700/50">
                        {catTasks.map((task, i) => {
                          const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                          return (
                            <div
                              key={task.id}
                              onClick={() => setEditingTask(task)}
                              className={clsx(
                                "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                                i < catTasks.length - 1 && "border-b border-gray-50 dark:border-gray-700/50",
                                task.priority === "p1" && "border-r-4 border-red-500"
                              )}
                            >
                              <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0", priorityColors[task.priority])}>
                                {task.priority.toUpperCase()}
                              </span>
                              <span className="flex-1 text-sm dark:text-gray-200 truncate">
                                {isOverdue && "🔴 "}{task.title}
                              </span>
                              <span className="text-sm flex-shrink-0">{ownerIcons[task.owner]}</span>
                              {task.due_date && (
                                <span className={clsx("text-[10px] flex-shrink-0", isOverdue ? "text-red-500 font-bold" : "text-gray-400 dark:text-gray-500")}>
                                  {task.due_date}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
          )}

          <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
            {backlogTasks.length} משימות בbacklog · לחץ על קטגוריה להרחבה
          </p>
        </div>
      )}

      <TaskAddModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddTask} />
      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleEditTask} onDelete={handleDeleteTask} />
      <TaskImportModal open={showImportModal} onClose={() => setShowImportModal(false)} onImport={() => fetchTasks()} />
    </div>
  );
}
