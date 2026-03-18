"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, List, LayoutGrid } from "lucide-react";
import type { Task, TaskStatus, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import { TASK_STATUSES, statusLabels, priorityColors, ownerIcons, categoryLabels } from "@/lib/types/tasks";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskAddModal } from "@/components/tasks/task-add-modal";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import { clsx } from "clsx";

type ViewMode = "kanban" | "list";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [hideDone, setHideDone] = useState(true);

  // Filters
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [filterOwner, setFilterOwner] = useState<TaskOwner | "all">("all");
  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">("all");

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Apply filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      if (filterOwner !== "all" && t.owner !== filterOwner) return false;
      if (filterCategory !== "all" && t.category !== filterCategory) return false;
      return true;
    });
  }, [tasks, filterPriority, filterOwner, filterCategory]);

  // Group by status for Kanban
  const columns = useMemo(() => {
    const cols: Record<TaskStatus, Task[]> = {
      backlog: [], todo: [], in_progress: [], waiting_ben: [], done: [],
    };
    filteredTasks.forEach(t => {
      if (cols[t.status]) cols[t.status].push(t);
    });
    const priorityOrder = { p1: 0, p2: 1, p3: 2 };
    Object.values(cols).forEach(arr => {
      arr.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.position - b.position);
    });
    return cols;
  }, [filteredTasks]);

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
    if (!res.ok) fetchTasks();
  }

  async function handleAddTask(taskData: {
    title: string; description: string; priority: TaskPriority;
    status: TaskStatus; owner: TaskOwner; category: TaskCategory; due_date: string | null;
  }) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskData, position: 0 }),
    });
    if (res.ok) {
      const task = await res.json();
      setTasks(prev => [task, ...prev]);
    }
  }

  async function handleEditTask(task: Task) {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id, title: task.title, description: task.description,
        priority: task.priority, status: task.status, owner: task.owner,
        category: task.category, due_date: task.due_date,
      }),
    });
    if (!res.ok) fetchTasks();
  }

  async function handleDeleteTask(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
  }

  // Stats
  const stats = useMemo(() => ({
    total: tasks.filter(t => t.status !== "done").length,
    p1: tasks.filter(t => t.priority === "p1" && t.status !== "done").length,
    waitingBen: tasks.filter(t => t.status === "waiting_ben").length,
    doneThisWeek: tasks.filter(t => {
      if (!t.completed_at) return false;
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(t.completed_at) > weekAgo;
    }).length,
  }), [tasks]);

  const visibleStatuses = hideDone ? TASK_STATUSES.filter(s => s !== "done") : TASK_STATUSES;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 dark:text-gray-500">טוען משימות...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">משימות</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {stats.total} פתוחות · {stats.p1} P1 · {stats.waitingBen} ממתינות לבן · {stats.doneThisWeek} הושלמו השבוע
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button onClick={() => setViewMode("kanban")} className={clsx("p-1.5 rounded-md", viewMode === "kanban" ? "bg-white dark:bg-gray-600 shadow-sm" : "")}>
              <LayoutGrid size={16} className={viewMode === "kanban" ? "text-brand-600" : "text-gray-400"} />
            </button>
            <button onClick={() => setViewMode("list")} className={clsx("p-1.5 rounded-md", viewMode === "list" ? "bg-white dark:bg-gray-600 shadow-sm" : "")}>
              <List size={16} className={viewMode === "list" ? "text-brand-600" : "text-gray-400"} />
            </button>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors">
            <Plus size={16} />
            משימה חדשה
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <TaskFilters priority={filterPriority} owner={filterOwner} category={filterCategory}
          onPriorityChange={setFilterPriority} onOwnerChange={setFilterOwner} onCategoryChange={setFilterCategory} />
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-brand-600" />
          הסתר הושלמו
        </label>
      </div>

      {/* Content */}
      {viewMode === "kanban" ? (
        <TaskKanban columns={columns} onStatusChange={handleStatusChange} onEdit={setEditingTask} visibleStatuses={visibleStatuses} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="text-right py-3 px-4 font-medium">משימה</th>
                <th className="text-center py-3 px-2 font-medium w-16">P</th>
                <th className="text-center py-3 px-2 font-medium w-16">מי</th>
                <th className="text-center py-3 px-2 font-medium w-24">קטגוריה</th>
                <th className="text-center py-3 px-2 font-medium w-28">סטטוס</th>
                <th className="text-center py-3 px-2 font-medium w-24">דדליין</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks
                .filter(t => hideDone ? t.status !== "done" : true)
                .sort((a, b) => ({ p1: 0, p2: 1, p3: 2 }[a.priority] - { p1: 0, p2: 1, p3: 2 }[b.priority]))
                .map(task => {
                  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
                  return (
                    <tr key={task.id} onClick={() => setEditingTask(task)}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                      <td className="py-2.5 px-4 dark:text-gray-200">{isOverdue && "🔴 "}{task.title}</td>
                      <td className="text-center">
                        <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[task.priority])}>{task.priority.toUpperCase()}</span>
                      </td>
                      <td className="text-center">{ownerIcons[task.owner]}</td>
                      <td className="text-center text-xs text-gray-500 dark:text-gray-400">{categoryLabels[task.category]}</td>
                      <td className="text-center text-xs text-gray-500 dark:text-gray-400">{statusLabels[task.status]}</td>
                      <td className={clsx("text-center text-xs", isOverdue ? "text-danger font-bold" : "text-gray-400 dark:text-gray-500")}>{task.due_date || "—"}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      <TaskAddModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddTask} />
      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleEditTask} onDelete={handleDeleteTask} />
    </div>
  );
}
