"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Upload, AlertCircle, Sun, Layers, Archive, Zap } from "lucide-react";
import type { Task, TaskStatus, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import { TASK_STATUSES, statusLabels, priorityColors, ownerIcons, categoryLabels, categoryColors } from "@/lib/types/tasks";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskAddModal } from "@/components/tasks/task-add-modal";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { TaskImportModal } from "@/components/tasks/task-import-modal";
import { Big3Today } from "@/components/tasks/big3-today";
import { TaskPillars } from "@/components/tasks/task-pillars";
import { loadSessionContext, saveSessionContext, sessionAgeLabel } from "@/lib/session-context";
import { clsx } from "clsx";

type ViewMode = "today" | "pillars" | "backlog";
type QueueMode = "claude" | "ben" | "all";

// Max tasks visible in Focus (Today) view — AUDHD threshold
const FOCUS_LIMIT = 3;
const WIP_LIMIT = 5;

const QUEUE_TABS: { id: QueueMode; label: string; icon: string }[] = [
  { id: "claude", label: "Claude", icon: "🤖" },
  { id: "ben",    label: "Ben",    icon: "🙋" },
  { id: "all",    label: "הכל",    icon: "👥" },
];

const STATUS_BADGE: Record<TaskStatus, string> = {
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  waiting_ben: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  todo:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  backlog:     "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  done:        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  backlog: "todo", todo: "in_progress", in_progress: "done", waiting_ben: "in_progress", done: null,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([]);
  const [backlogLoaded, setBacklogLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [queueMode, setQueueMode] = useState<QueueMode>("claude");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<TaskCategory>>(new Set());
  const [sessionCtx, setSessionCtx] = useState<ReturnType<typeof loadSessionContext>>(null);

  const pendingOps = useRef(new Set<string>());

  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">("all");
  const [filterOwner, setFilterOwner] = useState<TaskOwner | "all">("all");

  // Load session context on mount
  useEffect(() => {
    setSessionCtx(loadSessionContext());
  }, []);

  // Fetch active tasks (excludes backlog — fast load)
  const fetchTasks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/tasks?exclude_backlog=1");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError("שגיאה בטעינת משימות. נסה לרענן.");
    }
    setLoading(false);
  }, []);

  // Lazy load backlog only when tab clicked
  const fetchBacklog = useCallback(async () => {
    if (backlogLoaded) return;
    setBacklogLoading(true);
    try {
      const res = await fetch("/api/tasks?status=backlog");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBacklogTasks(Array.isArray(data) ? data : []);
      setBacklogLoaded(true);
    } catch (err) {
      console.error("Error fetching backlog:", err);
      setError("שגיאה בטעינת backlog.");
    }
    setBacklogLoading(false);
  }, [backlogLoaded]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  function handleViewChange(mode: ViewMode) {
    setViewMode(mode);
    if (mode === "backlog") fetchBacklog();
  }

  // Queue filter — base for all views
  const queueFiltered = useMemo(() => {
    return tasks.filter(t => {
      if (queueMode === "claude") return t.owner === "claude" || t.owner === "both";
      if (queueMode === "ben")    return t.owner === "ben"    || t.owner === "both";
      return true;
    });
  }, [tasks, queueMode]);

  // FOCUS (Today): max FOCUS_LIMIT tasks — in_progress first, then p1 todos
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
    return active.slice(0, FOCUS_LIMIT);
  }, [queueFiltered, filterCategory, filterPriority]);

  // PILLARS: all non-done, non-backlog tasks
  const pillarTasks = useMemo(() => {
    return queueFiltered.filter(t => t.status !== "done" && t.status !== "backlog");
  }, [queueFiltered]);

  // BACKLOG grouped by category
  const backlogFiltered = useMemo(() => {
    return backlogTasks.filter(t => {
      if (queueMode === "claude") return t.owner === "claude" || t.owner === "both";
      if (queueMode === "ben")    return t.owner === "ben"    || t.owner === "both";
      return true;
    });
  }, [backlogTasks, queueMode]);

  const backlogByCategory = useMemo(() => {
    const groups = {} as Record<TaskCategory, Task[]>;
    const cats: TaskCategory[] = ["one_tm", "self", "brand", "temp", "research"];
    cats.forEach(c => { groups[c] = []; });
    backlogFiltered.forEach(t => { if (groups[t.category]) groups[t.category].push(t); });
    const priorityOrder = { p1: 0, p2: 1, p3: 2 };
    (Object.keys(groups) as TaskCategory[]).forEach(c => groups[c].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]));
    return groups;
  }, [backlogFiltered]);

  const wipCount = useMemo(() => queueFiltered.filter(t => t.status === "in_progress").length, [queueFiltered]);

  const stats = useMemo(() => {
    const open = queueFiltered.filter(t => t.status !== "done");
    return {
      total: open.length,
      p1: open.filter(t => t.priority === "p1").length,
      inProgress: queueFiltered.filter(t => t.status === "in_progress").length,
      backlogCount: backlogTasks.filter(t => {
        if (queueMode === "claude") return t.owner === "claude" || t.owner === "both";
        if (queueMode === "ben")    return t.owner === "ben"    || t.owner === "both";
        return true;
      }).length,
    };
  }, [queueFiltered, backlogTasks, queueMode]);

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    if (newStatus === "in_progress") {
      const current = tasks.find(t => t.id === taskId);
      if (current?.status !== "in_progress" && wipCount >= WIP_LIMIT) {
        setError(`מגבלת WIP: מקסימום ${WIP_LIMIT} משימות בביצוע.`);
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

  function handleQuickAdvance(e: React.MouseEvent, task: Task) {
    e.stopPropagation();
    const next = NEXT_STATUS[task.status];
    if (next) handleStatusChange(task.id, next);
  }

  function handleTaskClick(task: Task) {
    saveSessionContext(task);
    setEditingTask(task);
  }

  function dismissSessionCtx() {
    setSessionCtx(null);
  }

  function jumpToSessionTask() {
    if (!sessionCtx) return;
    const task = tasks.find(t => t.id === sessionCtx.taskId);
    if (task) {
      setEditingTask(task);
    }
    setSessionCtx(null);
  }

  async function handleAddTask(taskData: {
    title: string; description: string; priority: TaskPriority;
    status: TaskStatus; owner: TaskOwner; category: TaskCategory; due_date: string | null; tags: string[];
  }) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskData, position: 0, tags: taskData.tags || [] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "שגיאה ביצירת משימה");
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
          category: task.category, due_date: task.due_date, tags: task.tags || [],
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
            <span className={clsx("font-medium", wipCount >= WIP_LIMIT ? "text-amber-500" : "")}>
              {" "}· {stats.inProgress}/{WIP_LIMIT} WIP
            </span>
            <span className="text-gray-400"> · {stats.backlogCount} backlog</span>
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

      {/* Session Restore Banner */}
      {sessionCtx && viewMode === "today" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-700 rounded-xl text-sm animate-in fade-in">
          <span className="text-brand-600 dark:text-brand-400 text-base">💾</span>
          <div className="flex-1">
            <span className="text-brand-700 dark:text-brand-300 font-medium">
              {sessionAgeLabel(sessionCtx.savedAt)}:
            </span>{" "}
            <span className="text-brand-600 dark:text-brand-400 truncate">{sessionCtx.taskTitle}</span>
          </div>
          <button
            onClick={jumpToSessionTask}
            className="px-3 py-1 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors flex-shrink-0"
          >
            ממשיך →
          </button>
          <button
            onClick={dismissSessionCtx}
            className="text-brand-400 hover:text-brand-600 dark:hover:text-brand-200 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

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
                if (tab.id === "ben")    return open && (t.owner === "ben"    || t.owner === "both");
                return open;
              }).length}
            </span>
          </button>
        ))}
      </div>

      {/* View Tabs — Focus / Pillars / Backlog */}
      <div className="flex items-center gap-0 border-b border-gray-200 dark:border-gray-700">
        {([
          { id: "today",   icon: Sun,    label: "Focus",    count: todayTasks.length },
          { id: "pillars", icon: Layers, label: "פילרים",   count: pillarTasks.length },
          { id: "backlog", icon: Archive, label: "Backlog", count: stats.backlogCount },
        ] as const).map(({ id, icon: Icon, label, count }) => (
          <button
            key={id}
            onClick={() => handleViewChange(id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all",
              viewMode === id
                ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            <Icon size={14} />
            {label}
            <span className={clsx(
              "text-xs px-1.5 py-0.5 rounded-full",
              viewMode === id
                ? "bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Secondary Filters (Focus + Backlog only) */}
      {(viewMode === "today" || viewMode === "backlog") && (
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
      )}

      {/* ── FOCUS VIEW ── */}
      {viewMode === "today" && (
        <div className="space-y-3">
          <Big3Today />

          {wipCount >= WIP_LIMIT && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-700 dark:text-amber-300">
              <Zap size={14} className="flex-shrink-0" />
              <span>WIP limit: {wipCount}/{WIP_LIMIT} בביצוע. סיים אחת לפני שמתחיל חדשה.</span>
            </div>
          )}

          {todayTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Sun size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">אין משימות פעילות</p>
              <p className="text-xs mt-1 opacity-70">העבר משימות מ-Backlog כדי להתחיל</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {todayTasks.map((task, i) => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                const nextS = NEXT_STATUS[task.status];
                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
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
                    {/* Quick advance */}
                    {nextS && (
                      <button
                        onClick={(e) => handleQuickAdvance(e, task)}
                        title={`→ ${statusLabels[nextS]}`}
                        className="text-[10px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-900/40 dark:hover:text-brand-300 transition-colors font-semibold flex-shrink-0"
                      >
                        →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {todayTasks.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {todayTasks.length}/{FOCUS_LIMIT} פוקוס · {stats.backlogCount} ממתינות בbacklog
            </p>
          )}
        </div>
      )}

      {/* ── PILLARS VIEW ── */}
      {viewMode === "pillars" && (
        <TaskPillars
          tasks={pillarTasks}
          onEdit={handleTaskClick}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* ── BACKLOG VIEW ── */}
      {viewMode === "backlog" && (
        <div className="space-y-2">
          {backlogLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
              טוען backlog...
            </div>
          ) : backlogFiltered.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Archive size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">הBacklog ריק</p>
            </div>
          ) : (
            (["one_tm", "self", "brand", "temp", "research"] as TaskCategory[])
              .filter(cat => backlogByCategory[cat]?.length > 0)
              .map(cat => {
                const isExpanded = expandedCategories.has(cat);
                const catTasks = backlogByCategory[cat];

                // Group by workstream
                const wsGroups = new Map<string, Task[]>();
                catTasks.forEach(t => {
                  const ws = t.workstream || "general";
                  if (!wsGroups.has(ws)) wsGroups.set(ws, []);
                  wsGroups.get(ws)!.push(t);
                });

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
                        {/* Workstream mini-chips */}
                        {!isExpanded && Array.from(wsGroups.entries()).slice(0, 3).map(([ws, wst]) => (
                          <span key={ws} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            #{ws} ({wst.length})
                          </span>
                        ))}
                      </div>
                      <span className="text-gray-300 dark:text-gray-600 text-xs">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-50 dark:border-gray-700/50">
                        {/* Workstream sub-groups */}
                        {Array.from(wsGroups.entries()).map(([ws, wsTasks]) => (
                          <div key={ws}>
                            <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-700/30 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                              #{ws} — {wsTasks.length}
                            </div>
                            {wsTasks.map((task, i) => {
                              const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                              return (
                                <div
                                  key={task.id}
                                  onClick={() => handleTaskClick(task)}
                                  className={clsx(
                                    "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                                    i < wsTasks.length - 1 && "border-b border-gray-50 dark:border-gray-700/30",
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
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}

          {!backlogLoading && backlogFiltered.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
              {backlogFiltered.length} משימות בbacklog
            </p>
          )}
        </div>
      )}

      <TaskAddModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddTask} />
      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleEditTask} onDelete={handleDeleteTask} />
      <TaskImportModal open={showImportModal} onClose={() => setShowImportModal(false)} onImport={() => { fetchTasks(); setBacklogLoaded(false); }} />
    </div>
  );
}
