"use client";

import { useState, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import { Plus, Upload, AlertCircle, Sun, Layers, Archive, Zap, CheckCircle2, ChevronDown, ChevronRight, GitBranch, RotateCcw, LayoutGrid } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import type { Task, TaskStatus, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import { TASK_STATUSES, statusLabels, priorityColors, ownerIcons, categoryLabels, categoryColors } from "@/lib/types/tasks";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskAddModal } from "@/components/tasks/task-add-modal";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { TaskImportModal } from "@/components/tasks/task-import-modal";
import { Big3Today } from "@/components/tasks/big3-today";
import { BulkActionBar } from "@/components/tasks/bulk-action-bar";
import { loadSessionContext, saveSessionContext, sessionAgeLabel } from "@/lib/session-context";
import { clsx } from "clsx";
import { useEffect } from "react";

// ─── Sub-tasks panel ──────────────────────────────────────────────────────────
const STATUS_BADGE: Record<TaskStatus, string> = {
  in_progress: "bg-gray-900 text-white dark:bg-white dark:text-gray-900",
  waiting_ben: "bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-800",
  up_next:     "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100",
  scheduled:   "border border-gray-300 dark:border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  todo:        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  backlog:     "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-500",
  inbox:       "border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400",
  waiting:     "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500",
  done:        "border border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600",
  someday:     "bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
  archived:    "bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-700",
};

function SubTasksPanel({ parentId, onEditTask }: { parentId: string; onEditTask: (t: Task) => void }) {
  const { data: subTasks = [], mutate } = useSWR<Task[]>(
    `/api/tasks?parent_id=${parentId}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 50);
  }, [adding]);

  async function handleAdd() {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: "p2",
          status: "todo",
          owner: "claude",
          category: "one_tm",
          parent_id: parentId,
          tags: [],
          position: 0,
        }),
      });
      setNewTitle("");
      setAdding(false);
      mutate();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pb-3 pt-1 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-50 dark:border-gray-700/30">
      <div className="flex items-center gap-1.5 mb-2">
        <GitBranch size={11} className="text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">תת-משימות</span>
      </div>

      {subTasks.length > 0 && (
        <div className="space-y-1 mb-2">
          {subTasks.map((sub) => (
            <div
              key={sub.id}
              onClick={() => onEditTask(sub)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-brand-200 dark:hover:border-brand-700 transition-colors"
            >
              <span className={clsx("text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0", STATUS_BADGE[sub.status])}>
                {statusLabels[sub.status]}
              </span>
              <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate">{sub.title}</span>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
            placeholder="שם תת-משימה..."
            className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-brand-300 dark:border-brand-600 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-brand-300 dark:text-gray-200 placeholder-gray-400"
          />
          <button
            onClick={handleAdd}
            disabled={!newTitle.trim() || saving}
            className="px-2.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors disabled:opacity-40"
          >
            {saving ? "..." : "הוסף"}
          </button>
          <button onClick={() => { setAdding(false); setNewTitle(""); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-[11px] text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium transition-colors"
        >
          <Plus size={12} />
          הוסף תת-משימה
        </button>
      )}
    </div>
  );
}

// ─── Inline List View ─────────────────────────────────────────────────────────
interface InlineListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onSave: (task: Task) => void;
  onDueDateChange: (taskId: string, newDate: string | null) => void;
}

function InlineListRow({ task, onEdit, onStatusChange, onSave, onDueDateChange }: {
  task: Task;
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSave: (task: Task) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleVal(task.title);
  }, [task.title]);

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus();
  }, [editingTitle]);

  function saveTitle() {
    if (titleVal.trim() && titleVal.trim() !== task.title) {
      onSave({ ...task, title: titleVal.trim() });
    }
    setEditingTitle(false);
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

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

function InlineListView({ tasks, onEdit, onStatusChange, onSave, onDueDateChange }: InlineListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500">
        <p className="text-sm">אין משימות</p>
      </div>
    );
  }
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
            {tasks.map(task => (
              <InlineListRow key={task.id} task={task} onEdit={onEdit} onStatusChange={onStatusChange} onSave={onSave} onDueDateChange={onDueDateChange} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ViewMode = "focus" | "board" | "list" | "backlog" | "completed" | "archived";
type QueueMode = "claude" | "ben" | "all";

// Max tasks visible in Focus (Today) view — AUDHD threshold
const FOCUS_LIMIT = 3;
const WIP_LIMIT = 5;

const QUEUE_TABS: { id: QueueMode; label: string; icon: string }[] = [
  { id: "claude", label: "Claude", icon: "🤖" },
  { id: "ben",    label: "Ben",    icon: "🙋" },
  { id: "all",    label: "הכל",    icon: "👥" },
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  backlog: "todo", todo: "in_progress", in_progress: "done", waiting_ben: "in_progress", done: null,
  inbox: "up_next", up_next: "in_progress", scheduled: "in_progress", waiting: "in_progress", someday: null, archived: null,
};

function TasksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const viewMode = (searchParams.get("tab") as ViewMode) || "focus";

  const [backlogLoaded, setBacklogLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueMode, setQueueMode] = useState<QueueMode>("claude");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<TaskCategory>>(new Set());
  const [sessionCtx, setSessionCtx] = useState<ReturnType<typeof loadSessionContext>>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [focusedTaskIndex, setFocusedTaskIndex] = useState(-1);
  const todayTasksRef = useRef<Task[]>([]);

  const pendingOps = useRef(new Set<string>());

  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">("all");
  const [filterOwner, setFilterOwner] = useState<TaskOwner | "all">("all");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // SWR — active tasks (excludes backlog)
  const { data: tasksData, isLoading: loading, mutate: mutateTasks } = useSWR(
    "/api/tasks?exclude_backlog=1",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const tasks: Task[] = Array.isArray(tasksData) ? tasksData : [];

  // SWR — backlog (lazy: only fetched when backlogLoaded = true)
  const { data: backlogData, isLoading: backlogLoading, mutate: mutateBacklog } = useSWR(
    backlogLoaded ? "/api/tasks?status=backlog" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  const backlogTasks: Task[] = Array.isArray(backlogData) ? backlogData : [];

  // SWR — completed (lazy: only fetched when viewing completed tab)
  const [completedLoaded, setCompletedLoaded] = useState(false);
  const { data: completedData, isLoading: completedLoading, mutate: mutateCompleted } = useSWR(
    completedLoaded ? "/api/tasks?status=done" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  const completedTasks: Task[] = Array.isArray(completedData) ? completedData : [];

  // SWR — archived (lazy)
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const { data: archivedData, isLoading: archivedLoading, mutate: mutateArchived } = useSWR(
    archivedLoaded ? "/api/tasks?archived=1" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
  const archivedTasks: Task[] = Array.isArray(archivedData) ? archivedData : [];

  // Load session context on mount
  useEffect(() => {
    setSessionCtx(loadSessionContext());
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Cmd+K quick add + arrow key navigation in focus view
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setQuickAddOpen(prev => !prev);
        setTimeout(() => quickAddRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && quickAddOpen) {
        setQuickAddOpen(false);
        setQuickAddTitle("");
      }
      // Arrow navigation in focus view (skip if typing in input/textarea)
      if (viewMode === "focus" && !quickAddOpen && !editingTask) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        const tasks_ = todayTasksRef.current;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedTaskIndex(i => Math.min(i + 1, tasks_.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedTaskIndex(i => Math.max(i - 1, 0));
        } else if (e.key === "Enter" && focusedTaskIndex >= 0 && tasks_[focusedTaskIndex]) {
          e.preventDefault();
          handleTaskClick(tasks_[focusedTaskIndex]);
        } else if (e.key === "ArrowRight" && focusedTaskIndex >= 0 && tasks_[focusedTaskIndex]) {
          e.preventDefault();
          const t = tasks_[focusedTaskIndex];
          const next = NEXT_STATUS[t.status];
          if (next) handleStatusChange(t.id, next);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickAddOpen, viewMode, focusedTaskIndex, editingTask]);

  function handleViewChange(mode: ViewMode) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", mode);
    router.push(`${pathname}?${params.toString()}`, { scroll: false } as Parameters<typeof router.push>[1]);
    setFocusedTaskIndex(-1);
    if (mode === "backlog") setBacklogLoaded(true);
    if (mode === "completed") setCompletedLoaded(true);
    if (mode === "archived") setArchivedLoaded(true);
  }

  // Queue filter — base for all views
  const queueFiltered = useMemo(() => {
    return tasks.filter(t => {
      if (queueMode === "claude") return t.owner === "claude" || t.owner === "both";
      if (queueMode === "ben")    return t.owner === "ben"    || t.owner === "both";
      return true;
    });
  }, [tasks, queueMode]);

  function getCurrentSlot(): 'morning' | 'afternoon' | 'evening' | null {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 20 && hour < 22) return 'evening';
    return null;
  }

  // FOCUS (Today): slot-aware, max FOCUS_LIMIT
  const todayTasks = useMemo(() => {
    const currentSlot = getCurrentSlot();
    const today = new Date().toISOString().split('T')[0];
    const active = queueFiltered.filter(t => {
      if (t.status === "done" || t.status === "backlog") return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      const isBase = t.status === "in_progress" || t.status === "waiting_ben" || (t.status === "todo" && t.priority === "p1");
      if (!isBase) return false;
      const isOverdue = t.due_date && t.due_date < today;
      if (isOverdue) return true;
      if (!currentSlot) return true;
      const taskSlot = t.time_slot || "any";
      return taskSlot === "any" || taskSlot === currentSlot;
    });
    const statusOrder: Record<TaskStatus, number> = { in_progress: 0, waiting_ben: 1, todo: 2, up_next: 3, scheduled: 4, backlog: 5, inbox: 6, waiting: 7, done: 8, someday: 9, archived: 10 };
    const priorityOrder: Record<string, number> = { p0: -1, p1: 0, p2: 1, p3: 2 };
    active.sort((a, b) => {
      const aScore = (a.due_date && a.due_date < today ? 1000 : 0) + (a.priority_score ?? 0);
      const bScore = (b.due_date && b.due_date < today ? 1000 : 0) + (b.priority_score ?? 0);
      return statusOrder[a.status] - statusOrder[b.status] || bScore - aScore || priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    return active.slice(0, FOCUS_LIMIT);
  }, [queueFiltered, filterCategory, filterPriority]);
  todayTasksRef.current = todayTasks;

  // PILLARS/LIST: all non-done, non-backlog tasks
  const pillarTasks = useMemo(() => {
    return queueFiltered.filter(t => t.status !== "done" && t.status !== "backlog");
  }, [queueFiltered]);

  // BOARD: tasks grouped by status column
  const boardColumns = useMemo(() => {
    const cols = {} as Record<TaskStatus, Task[]>;
    (["inbox", "up_next", "scheduled", "in_progress", "waiting", "waiting_ben", "todo", "done", "backlog", "someday", "archived"] as TaskStatus[]).forEach(s => { cols[s] = []; });
    const today = new Date().toISOString().split('T')[0];
    queueFiltered.forEach(t => {
      if (!cols[t.status]) return;
      const isOverdue = t.due_date && t.due_date < today && t.status !== "done";
      const escalated = isOverdue ? { ...t, priority_score: (t.priority_score ?? 0) + 1000 } : t;
      cols[t.status].push(escalated);
    });
    Object.keys(cols).forEach(s => {
      cols[s as TaskStatus].sort((a, b) => (b.priority_score ?? b.position ?? 0) - (a.priority_score ?? a.position ?? 0));
    });
    return cols;
  }, [queueFiltered]);

  const SLOT_CAPACITY = { morning: 180, afternoon: 240, evening: 120 };

  // Weekly capacity: next 7 days
  const weeklyCapacity = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayTasks = queueFiltered.filter(t => t.due_date === dateStr && t.status !== "done" && t.estimated_minutes);
      const morningMin = dayTasks.filter(t => t.time_slot === "morning").reduce((s, t) => s + (t.estimated_minutes || 0), 0);
      const afternoonMin = dayTasks.filter(t => t.time_slot === "afternoon").reduce((s, t) => s + (t.estimated_minutes || 0), 0);
      const eveningMin = dayTasks.filter(t => t.time_slot === "evening").reduce((s, t) => s + (t.estimated_minutes || 0), 0);
      const anyMin = dayTasks.filter(t => !t.time_slot || t.time_slot === "any").reduce((s, t) => s + (t.estimated_minutes || 0), 0);
      return {
        date: dateStr,
        label: d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric" }),
        morning: morningMin + anyMin,
        afternoon: afternoonMin + anyMin,
        evening: eveningMin + anyMin,
        total: morningMin + afternoonMin + eveningMin + anyMin,
      };
    });
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
    const cats: TaskCategory[] = ["one_tm", "brand", "research"];
    cats.forEach(c => { groups[c] = []; });
    backlogFiltered.forEach(t => { if (groups[t.category]) groups[t.category].push(t); });
    const priorityOrder: Record<string, number> = { p0: -1, p1: 0, p2: 1, p3: 2 };
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

  // ── Bulk selection helpers ──
  function toggleSelect(taskId: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkPriority(priority: TaskPriority) {
    const ids = Array.from(selectedIds);
    // Optimistic update
    mutateTasks(tasks.map(t => ids.includes(t.id) ? { ...t, priority } : t), false);
    try {
      const res = await fetch("/api/tasks/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, updates: { priority } }),
      });
      if (!res.ok) throw new Error();
      mutateTasks(); mutateBacklog();
    } catch { mutateTasks(); mutateBacklog(); setError("שגיאה בעדכון bulk"); }
    clearSelection();
  }

  async function handleBulkStatus(status: TaskStatus) {
    const ids = Array.from(selectedIds);
    mutateTasks(tasks.map(t => ids.includes(t.id) ? { ...t, status } : t), false);
    try {
      const res = await fetch("/api/tasks/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, updates: { status } }),
      });
      if (!res.ok) throw new Error();
      mutateTasks(); mutateBacklog(); mutateCompleted();
    } catch { mutateTasks(); mutateBacklog(); mutateCompleted(); setError("שגיאה בעדכון bulk"); }
    clearSelection();
  }

  async function handleRestore(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/archive`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      mutateArchived();
      mutateTasks();
    } catch {
      setError("שגיאה בשחזור");
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    mutateTasks(tasks.filter(t => !ids.includes(t.id)), false);
    try {
      const res = await fetch("/api/tasks/bulk-update", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      mutateTasks(); mutateBacklog(); mutateCompleted();
    } catch { mutateTasks(); mutateBacklog(); mutateCompleted(); setError("שגיאה במחיקת bulk"); }
    clearSelection();
  }

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

    // Optimistic update via SWR mutate
    const optimistic = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    mutateTasks(optimistic, false);

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus, manually_positioned: false }),
      });
      if (!res.ok) throw new Error();
      mutateTasks();
    } catch {
      mutateTasks(); // revert by revalidating
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

  async function handlePriorityChange(taskId: string, newPriority: TaskPriority) {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    const optimistic = tasks.map(t => t.id === taskId ? { ...t, priority: newPriority } : t);
    mutateTasks(optimistic, false);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, priority: newPriority }),
      });
      if (!res.ok) throw new Error();
      mutateTasks();
    } catch { mutateTasks(); setError("שגיאה בעדכון עדיפות"); }
    finally { pendingOps.current.delete(taskId); }
  }

  async function handleDueDateChange(taskId: string, newDate: string | null) {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    const optimistic = tasks.map(t => t.id === taskId ? { ...t, due_date: newDate } : t);
    mutateTasks(optimistic, false);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, due_date: newDate, manually_positioned: false }),
      });
      if (!res.ok) throw new Error();
      mutateTasks();
    } catch { mutateTasks(); setError("שגיאה בעדכון תאריך"); }
    finally { pendingOps.current.delete(taskId); }
  }

  async function handlePositionChange(taskId: string, newPosition: number) {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);
    mutateTasks(tasks.map(t => t.id === taskId ? { ...t, position: newPosition, manually_positioned: true } : t), false);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, position: newPosition, manually_positioned: true }),
      });
      if (!res.ok) throw new Error();
      mutateTasks();
    } catch {
      mutateTasks();
      setError("שגיאה בשמירת מיקום");
    } finally {
      pendingOps.current.delete(taskId);
    }
  }

  async function handleQuickAdd() {
    if (!quickAddTitle.trim()) return;
    await handleAddTask({
      title: quickAddTitle.trim(), description: "", priority: "p2",
      status: "todo", owner: "claude", category: "one_tm", due_date: null, tags: [],
    });
    setQuickAddTitle("");
    setQuickAddOpen(false);
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
    status: TaskStatus; owner: TaskOwner; category: TaskCategory; due_date: string | null;
    estimated_minutes?: number | null; time_slot?: string | null;
    impact?: string | null; size?: string | null;
    tags: string[];
    is_recurring?: boolean; recur_pattern?: string | null;
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
      mutateTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת משימה");
    }
  }

  async function handleEditTask(task: Task) {
    if (pendingOps.current.has(task.id)) return;
    pendingOps.current.add(task.id);

    // Optimistic update
    mutateTasks(tasks.map(t => t.id === task.id ? task : t), false);

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
          manually_positioned: task.manually_positioned ?? false,
        }),
      });
      if (!res.ok) throw new Error();
      mutateTasks();
    } catch {
      mutateTasks(); // revert by revalidating
      setError("שגיאה בעדכון משימה");
    } finally {
      pendingOps.current.delete(task.id);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (pendingOps.current.has(taskId)) return;
    pendingOps.current.add(taskId);

    // Optimistic update
    mutateTasks(tasks.filter(t => t.id !== taskId), false);

    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      mutateTasks();
    } catch {
      mutateTasks(); // revert by revalidating
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
      {sessionCtx && viewMode === "focus" && (
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

      {/* Quick Add Bar (Cmd+K) */}
      {quickAddOpen && (
        <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-brand-200 dark:border-brand-700 rounded-xl shadow-lg animate-in fade-in">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">⌘K</span>
          <input
            ref={quickAddRef}
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
            placeholder="הוסף משימה מהירה..."
            className="flex-1 text-sm bg-transparent outline-none dark:text-gray-200 placeholder-gray-400"
            autoFocus
          />
          <button
            onClick={handleQuickAdd}
            disabled={!quickAddTitle.trim()}
            className="px-3 py-1 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition-colors disabled:opacity-40"
          >
            הוסף
          </button>
          <button onClick={() => { setQuickAddOpen(false); setQuickAddTitle(""); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
        </div>
      )}

      {/* Weekly Capacity View */}
      {(viewMode === "board" || viewMode === "list") && (
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-1 min-w-max">
            {weeklyCapacity.map(day => {
              const mPct = Math.min(100, Math.round((day.morning / SLOT_CAPACITY.morning) * 100));
              const aPct = Math.min(100, Math.round((day.afternoon / SLOT_CAPACITY.afternoon) * 100));
              const ePct = Math.min(100, Math.round((day.evening / SLOT_CAPACITY.evening) * 100));
              const isOver = mPct >= 100 || aPct >= 100 || ePct >= 100;
              return (
                <div key={day.date} className={clsx("flex-shrink-0 w-[100px] rounded-xl border px-2 py-2 text-[10px]", isOver ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10" : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800")}>
                  <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1.5 truncate">{day.label}</p>
                  {[
                    { label: "בוקר", pct: mPct, min: day.morning, cap: SLOT_CAPACITY.morning },
                    { label: "אחה״צ", pct: aPct, min: day.afternoon, cap: SLOT_CAPACITY.afternoon },
                    { label: "ערב", pct: ePct, min: day.evening, cap: SLOT_CAPACITY.evening },
                  ].map(({ label, pct, min, cap }) => (
                    <div key={label} className="mb-1">
                      <div className="flex justify-between text-gray-400 dark:text-gray-500 mb-0.5">
                        <span>{label}</span>
                        <span className={clsx(pct >= 100 ? "text-amber-600 dark:text-amber-400 font-bold" : "")}>{min}/{cap}</span>
                      </div>
                      <div className="h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div className={clsx("h-full rounded-full transition-all", pct >= 100 ? "bg-amber-400" : "bg-brand-400")} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Tabs — Focus / Board / List / Backlog / Completed / Archived */}
      <div className="flex items-center gap-0 border-b border-gray-200 dark:border-gray-700">
        {([
          { id: "focus",     icon: Sun,          label: "Focus",   count: todayTasks.length },
          { id: "board",     icon: LayoutGrid,   label: "Board",   count: pillarTasks.length },
          { id: "list",      icon: Layers,       label: "רשימה",   count: pillarTasks.length },
          { id: "backlog",   icon: Archive,      label: "Backlog", count: stats.backlogCount },
          { id: "completed", icon: CheckCircle2, label: "הושלמו",  count: completedTasks.length },
          { id: "archived",  icon: Archive,      label: "ארכיון",  count: archivedTasks.length },
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
      {(viewMode === "focus" || viewMode === "backlog") && (
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
      {viewMode === "focus" && (
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
                const isFocused = focusedTaskIndex === i;
                const isExpanded = expandedTaskId === task.id;
                return (
                  <div key={task.id} className={clsx(i < todayTasks.length - 1 && !isExpanded && "border-b border-gray-50 dark:border-gray-700/50")}>
                    <div
                      onClick={() => { setFocusedTaskIndex(i); handleTaskClick(task); }}
                      className={clsx(
                        "flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50",
                        task.priority === "p1" && "border-r-4 border-red-500",
                        isFocused && "bg-brand-50 dark:bg-brand-900/20 ring-1 ring-inset ring-brand-200 dark:ring-brand-700",
                        selectedIds.has(task.id) && "bg-brand-50/60 dark:bg-brand-900/30"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(task.id)}
                        onChange={() => toggleSelect(task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 flex-shrink-0 cursor-pointer"
                      />
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
                      {/* Sub-tasks toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                        title="תת-משימות"
                        className={clsx(
                          "flex items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors flex-shrink-0",
                          isExpanded
                            ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400"
                            : "text-gray-300 dark:text-gray-600 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        )}
                      >
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <GitBranch size={10} />
                      </button>
                    </div>
                    {isExpanded && (
                      <SubTasksPanel parentId={task.id} onEditTask={handleTaskClick} />
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

      {/* ── BOARD VIEW ── */}
      {viewMode === "board" && (
        <div className="overflow-x-auto -mx-4 px-4">
          <TaskKanban
            columns={boardColumns}
            onStatusChange={handleStatusChange}
            onEdit={handleTaskClick}
            onPriorityChange={handlePriorityChange}
            onDelete={handleDeleteTask}
            onDueDateChange={handleDueDateChange}
            onPositionChange={handlePositionChange}
            visibleStatuses={["in_progress", "waiting_ben", "up_next", "todo", "inbox", "waiting", "scheduled"]}
          />
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <InlineListView
          tasks={pillarTasks}
          onEdit={handleTaskClick}
          onStatusChange={handleStatusChange}
          onSave={handleEditTask}
          onDueDateChange={handleDueDateChange}
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
                              const isExpanded = expandedTaskId === task.id;
                              return (
                                <div key={task.id} className={clsx(i < wsTasks.length - 1 && !isExpanded && "border-b border-gray-50 dark:border-gray-700/30")}>
                                  <div
                                    onClick={() => handleTaskClick(task)}
                                    className={clsx(
                                      "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                                      task.priority === "p1" && "border-r-4 border-red-500",
                                      selectedIds.has(task.id) && "bg-brand-50/60 dark:bg-brand-900/30"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(task.id)}
                                      onChange={() => toggleSelect(task.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500 flex-shrink-0 cursor-pointer"
                                    />
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
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                                      title="תת-משימות"
                                      className={clsx(
                                        "flex items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors flex-shrink-0",
                                        isExpanded
                                          ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400"
                                          : "text-gray-300 dark:text-gray-600 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                      )}
                                    >
                                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                      <GitBranch size={10} />
                                    </button>
                                  </div>
                                  {isExpanded && (
                                    <SubTasksPanel parentId={task.id} onEditTask={handleTaskClick} />
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

      {/* ── COMPLETED VIEW ── */}
      {viewMode === "completed" && (
        <div className="space-y-2">
          {completedLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin" />
              טוען הושלמו...
            </div>
          ) : completedTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">אין משימות שהושלמו</p>
            </div>
          ) : (() => {
            // Group completed tasks by week
            const sorted = [...completedTasks].sort((a, b) =>
              new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime()
            );
            const groups: { label: string; tasks: Task[] }[] = [];
            const now = new Date();
            const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay());
            thisWeekStart.setHours(0,0,0,0);
            const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

            const thisWeek: Task[] = [], lastWeek: Task[] = [], older: Task[] = [];
            sorted.forEach(t => {
              const d = new Date(t.completed_at || t.updated_at);
              if (d >= thisWeekStart) thisWeek.push(t);
              else if (d >= lastWeekStart) lastWeek.push(t);
              else older.push(t);
            });
            if (thisWeek.length > 0) groups.push({ label: "השבוע", tasks: thisWeek });
            if (lastWeek.length > 0) groups.push({ label: "שבוע שעבר", tasks: lastWeek });
            if (older.length > 0) groups.push({ label: "קודם", tasks: older });

            return groups.map(group => (
              <div key={group.label}>
                <div className="flex items-center gap-2 py-2">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-2">{group.label}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{group.tasks.length}</span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  {group.tasks.map((task, i) => (
                    <div
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={clsx(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                        i < group.tasks.length - 1 && "border-b border-gray-50 dark:border-gray-700/50"
                      )}
                    >
                      <CheckCircle2 size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-500 dark:text-gray-400 line-through truncate block">
                          {task.title}
                        </span>
                        {task.description && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate block mt-0.5">
                            {task.description.slice(0, 80)}
                          </span>
                        )}
                      </div>
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0", categoryColors[task.category])}>
                        {categoryLabels[task.category]}
                      </span>
                      <span className="text-xs flex-shrink-0">{ownerIcons[task.owner]}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {task.completed_at
                          ? new Date(task.completed_at).toLocaleDateString("he-IL")
                          : new Date(task.updated_at).toLocaleDateString("he-IL")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── ARCHIVED VIEW ── */}
      {viewMode === "archived" && (
        <div className="space-y-2">
          {archivedLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-red-500 rounded-full animate-spin" />
              טוען ארכיון...
            </div>
          ) : archivedTasks.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Archive size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">הארכיון ריק</p>
              <p className="text-xs mt-1 opacity-70">משימות שנמחקו עם סיבה יופיעו כאן</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {archivedTasks
                .sort((a, b) => new Date(b.archived_at || b.updated_at).getTime() - new Date(a.archived_at || a.updated_at).getTime())
                .map((task, i) => (
                  <div
                    key={task.id}
                    className={clsx(
                      "flex items-center gap-3 px-4 py-3",
                      i < archivedTasks.length - 1 && "border-b border-gray-50 dark:border-gray-700/50"
                    )}
                  >
                    <Archive size={14} className="text-red-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400 line-through truncate block">
                        {task.title}
                      </span>
                      {task.archive_reason && (
                        <span className="text-[10px] text-red-400 dark:text-red-500 block mt-0.5">
                          סיבה: {task.archive_reason}
                        </span>
                      )}
                    </div>
                    <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0", categoryColors[task.category])}>
                      {categoryLabels[task.category]}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {task.archived_at
                        ? new Date(task.archived_at).toLocaleDateString("he-IL")
                        : "—"}
                    </span>
                    <button
                      onClick={() => handleRestore(task.id)}
                      title="שחזר מארכיון"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      <TaskAddModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddTask} />
      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleEditTask} onDelete={handleDeleteTask} />
      <TaskImportModal open={showImportModal} onClose={() => setShowImportModal(false)} onImport={() => { mutateTasks(); setBacklogLoaded(false); mutateBacklog(); }} />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onChangePriority={handleBulkPriority}
        onChangeStatus={handleBulkStatus}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96"><div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" /></div>}>
      <TasksPageContent />
    </Suspense>
  );
}
