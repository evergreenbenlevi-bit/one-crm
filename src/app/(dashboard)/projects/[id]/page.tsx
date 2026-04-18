"use client";

import { useState, useMemo, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Plus, ArrowRight, LayoutGrid, List, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { fetcher } from "@/lib/fetcher";
import type { Task, TaskStatus, TaskPriority, TaskOwner, TaskCategory, EstimatedMinutes, TaskImpact, TaskSize } from "@/lib/types/tasks";
import { TASK_STATUSES, statusLabels, priorityColors, ownerIcons, categoryLabels, categoryColors, statusColors } from "@/lib/types/tasks";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskAddModal } from "@/components/tasks/task-add-modal";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import Link from "next/link";

type ProjectStatus = "active" | "paused" | "done" | "archived";
type ProjectPriority = "p1" | "p2" | "p3";
type Portfolio = "one" | "solo" | "harness" | "exploratory";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  portfolio: Portfolio | null;
  owner: string;
  deadline: string | null;
  tasks: Task[];
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  done: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  archived: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "פעיל",
  paused: "מושהה",
  done: "הושלם",
  archived: "בארכיון",
};

const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  p1: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  p2: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  p3: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

// ── Inline List View (scoped to project tasks) ────────────────────────────────
function InlineListRow({
  task,
  onEdit,
  onStatusChange,
  onSave,
  onDueDateChange,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSave: (task: Task) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const titleRef = useRef<HTMLInputElement>(null);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  function saveTitle() {
    if (titleVal.trim() && titleVal.trim() !== task.title) {
      onSave({ ...task, title: titleVal.trim() });
    }
    setEditingTitle(false);
  }

  return (
    <tr className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
      <td className="px-4 py-2.5">
        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setTitleVal(task.title); setEditingTitle(false); } }}
            autoFocus
            className="w-full text-sm px-2 py-1 rounded-lg border border-brand-300 dark:border-brand-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-brand-400"
          />
        ) : (
          <div className="flex items-center gap-2">
            {isOverdue && <span className="text-red-500 text-xs flex-shrink-0">🔴</span>}
            <span
              className="text-sm text-gray-700 dark:text-gray-200 cursor-text hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate"
              onClick={() => setEditingTitle(true)}
            >{task.title}</span>
            <button onClick={() => onEdit(task)} className="flex-shrink-0 text-[10px] text-gray-300 hover:text-brand-500 dark:hover:text-brand-400 transition-colors">ערוך</button>
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 w-[130px]">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="text-[11px] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:ring-1 focus:ring-brand-400 outline-none w-full"
        >
          {TASK_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5 w-[140px]">
        <input
          type="date"
          value={task.due_date || ""}
          onChange={(e) => onDueDateChange(task.id, e.target.value || null)}
          className={clsx(
            "text-[11px] px-2 py-1 rounded-lg border bg-white dark:bg-gray-700 outline-none focus:ring-1 focus:ring-brand-400 w-full",
            isOverdue ? "border-red-300 dark:border-red-700 text-red-600 dark:text-red-400" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300"
          )}
        />
      </td>
      <td className="px-3 py-2.5 w-16">
        <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[task.priority])}>
          {task.priority.toUpperCase()}
        </span>
      </td>
      <td className="px-3 py-2.5 w-[100px]">
        <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", categoryColors[task.category])}>
          {categoryLabels[task.category]}
        </span>
      </td>
    </tr>
  );
}

function ProjectInlineList({
  tasks,
  onEdit,
  onStatusChange,
  onSave,
  onDueDateChange,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSave: (task: Task) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-sm">אין משימות בפרויקט</p>
        <p className="text-xs mt-1 opacity-70">לחץ "הוסף משימה" כדי להתחיל</p>
      </div>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const pOrder: Record<string, number> = { p0: -1, p1: 0, p2: 1, p3: 2 };
    return (pOrder[a.priority] ?? 0) - (pOrder[b.priority] ?? 0);
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 text-right">משימה</th>
              <th className="px-3 py-2.5 text-right w-[130px]">סטטוס</th>
              <th className="px-3 py-2.5 text-right w-[140px]">דדליין</th>
              <th className="px-3 py-2.5 text-right w-16">עדיפות</th>
              <th className="px-3 py-2.5 text-right w-[100px]">קטגוריה</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(task => (
              <InlineListRow
                key={task.id}
                task={task}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
                onSave={onSave}
                onDueDateChange={onDueDateChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page content ─────────────────────────────────────────────────────────
function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.id as string;

  const viewMode = (searchParams.get("tab") as "board" | "list") || "board";
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingOps = useRef(new Set<string>());

  const { data: projectData, mutate } = useSWR<Project>(
    `/api/projects/${projectId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const project = projectData ?? null;
  const projectTasks: Task[] = projectData?.tasks ?? [];

  // Build board columns
  const boardColumns = useMemo(() => {
    const cols = {} as Record<TaskStatus, Task[]>;
    (["inbox", "up_next", "scheduled", "in_progress", "waiting", "waiting_ben", "todo", "done", "backlog", "someday", "archived"] as TaskStatus[]).forEach(s => { cols[s] = []; });
    const today = new Date().toISOString().split("T")[0];
    projectTasks.forEach(t => {
      if (!cols[t.status]) return;
      const isOverdue = t.due_date && t.due_date < today && t.status !== "done";
      const escalated = isOverdue ? { ...t, priority_score: (t.priority_score ?? 0) + 1000 } : t;
      cols[t.status].push(escalated);
    });
    Object.keys(cols).forEach(s => {
      cols[s as TaskStatus].sort((a, b) => (b.priority_score ?? b.position ?? 0) - (a.priority_score ?? a.position ?? 0));
    });
    return cols;
  }, [projectTasks]);

  const progress = useMemo(() => {
    const total = projectTasks.length;
    const done = projectTasks.filter(t => t.status === "done").length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [projectTasks]);

  function handleViewChange(mode: "board" | "list") {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", mode);
    router.push(`${pathname}?${p.toString()}`, { scroll: false } as Parameters<typeof router.push>[1]);
  }

  async function handleAddTask(taskData: {
    title: string; description: string; priority: TaskPriority;
    status: TaskStatus; owner: TaskOwner; category: TaskCategory; due_date: string | null;
    estimated_minutes?: EstimatedMinutes | null; time_slot?: string | null;
    impact?: TaskImpact | null; size?: TaskSize | null;
    tags: string[]; is_recurring?: boolean; recur_pattern?: string | null;
    project_id?: string | null;
  }) {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskData, project_id: projectId, position: 0, tags: taskData.tags || [] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "שגיאה ביצירת משימה");
      }
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת משימה");
    }
  }

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus, manually_positioned: false }),
      });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      mutate();
      setError("שגיאה בעדכון סטטוס");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }, [mutate]);

  const handlePositionChange = useCallback(async (taskId: string, newPosition: number) => {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, position: newPosition, manually_positioned: true }),
      });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      mutate();
      setError("שגיאה בשמירת מיקום");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }, [mutate]);

  const handlePriorityChange = useCallback(async (taskId: string, newPriority: TaskPriority) => {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, priority: newPriority }),
      });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      mutate();
      setError("שגיאה בעדכון עדיפות");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }, [mutate]);

  const handleDueDateChange = useCallback(async (taskId: string, newDate: string | null) => {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, due_date: newDate, manually_positioned: false }),
      });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      mutate();
      setError("שגיאה בעדכון תאריך");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }, [mutate]);

  async function handleEditTask(task: Task) {
    if (pendingOps.current.has(task.id)) return;
    pendingOps.current.add(task.id);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id, title: task.title, description: task.description,
          priority: task.priority, status: task.status, owner: task.owner,
          category: task.category, due_date: task.due_date, tags: task.tags || [],
          estimated_minutes: task.estimated_minutes, actual_minutes: task.actual_minutes,
          time_slot: task.time_slot, impact: task.impact, size: task.size,
          project_id: task.project_id,
          manually_positioned: task.manually_positioned ?? false,
        }),
      });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      mutate();
      setError("שגיאה בעדכון משימה");
    } finally {
      pendingOps.current.delete(task.id);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      mutate();
    } catch {
      mutate();
      setError("שגיאה במחיקת משימה");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }

  if (!projectData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
          טוען פרויקט...
        </div>
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-20 text-gray-400">פרויקט לא נמצא</div>;
  }

  const today = new Date().toISOString().split("T")[0];
  const isOverdue = project.deadline && project.deadline < today && project.status !== "done";

  return (
    <div className="space-y-6">
      {/* Error Toast */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 animate-in fade-in">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="mr-auto text-red-400 hover:text-red-600 dark:hover:text-red-200">✕</button>
        </div>
      )}

      {/* Back + Header */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-3 transition-colors"
        >
          <ArrowRight size={14} />
          חזרה לפרויקטים
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", PRIORITY_COLORS[project.priority])}>
                {project.priority.toUpperCase()}
              </span>
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full font-semibold", STATUS_COLORS[project.status])}>
                {STATUS_LABELS[project.status]}
              </span>
              {project.deadline && (
                <span className={clsx("text-xs font-medium", isOverdue ? "text-red-500" : "text-gray-400 dark:text-gray-500")}>
                  {isOverdue ? "🔴 " : ""}{project.deadline}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold dark:text-gray-100">{project.title}</h1>
            {project.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            הוסף משימה
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-500 dark:text-gray-400">התקדמות</span>
          <span className="font-bold dark:text-gray-200">{progress.done}/{progress.total} ({progress.pct}%)</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all", progress.pct === 100 ? "bg-green-500" : "bg-brand-500")}
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
          {TASK_STATUSES.map(s => {
            const count = boardColumns[s]?.length ?? 0;
            if (!count) return null;
            return <span key={s}>{statusLabels[s]}: {count}</span>;
          })}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        {([
          { id: "board" as const, icon: LayoutGrid, label: "Board", count: projectTasks.filter(t => t.status !== "done" && t.status !== "archived").length },
          { id: "list" as const, icon: List, label: "רשימה", count: projectTasks.length },
        ]).map(({ id, icon: Icon, label, count }) => (
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

      {/* Board View */}
      {viewMode === "board" && (
        <div className="overflow-x-auto -mx-4 px-4">
          <TaskKanban
            columns={boardColumns}
            onStatusChange={handleStatusChange}
            onEdit={setEditingTask}
            onPriorityChange={handlePriorityChange}
            onDelete={handleDeleteTask}
            onDueDateChange={handleDueDateChange}
            onPositionChange={handlePositionChange}
            visibleStatuses={["in_progress", "waiting_ben", "up_next", "todo", "inbox", "waiting", "scheduled"]}
          />
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <ProjectInlineList
          tasks={projectTasks}
          onEdit={setEditingTask}
          onStatusChange={handleStatusChange}
          onSave={handleEditTask}
          onDueDateChange={handleDueDateChange}
        />
      )}

      <TaskAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddTask}
        initialProjectId={projectId}
      />
      <TaskEditModal
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleEditTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-96">
        <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
      </div>
    }>
      <ProjectDetailContent />
    </Suspense>
  );
}
