"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, ArrowRight, LayoutGrid, List } from "lucide-react";
import { clsx } from "clsx";
import type { Task, TaskStatus, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import {
  TASK_STATUSES, statusLabels, priorityColors, ownerIcons, ownerLabels,
  categoryColors, categoryLabels, statusColors
} from "@/lib/types/tasks";
import { TaskAddModal } from "@/components/tasks/task-add-modal";
import { TaskEditModal } from "@/components/tasks/task-edit-modal";
import Link from "next/link";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      const allTasks: Task[] = await res.json();
      const parent = allTasks.find(t => t.id === projectId);
      const children = allTasks.filter(t => t.parent_id === projectId);
      setProject(parent || null);
      setSubtasks(children);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = useMemo(() => {
    const cols: Record<TaskStatus, Task[]> = {
      backlog: [], todo: [], in_progress: [], waiting_ben: [], done: [],
      inbox: [], up_next: [], scheduled: [], waiting: [], someday: [], archived: [],
    };
    subtasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });
    return cols;
  }, [subtasks]);

  const progress = useMemo(() => {
    const total = subtasks.length;
    const done = subtasks.filter(t => t.status === "done").length;
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [subtasks]);

  async function handleAddSubtask(taskData: {
    title: string; description: string; priority: TaskPriority;
    status: string; owner: TaskOwner; category: TaskCategory; due_date: string | null;
  }) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskData, parent_id: projectId, position: 0 }),
    });
    if (res.ok) fetchData();
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    setSubtasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status: newStatus }),
    });
    if (!res.ok) fetchData();
  }

  async function handleEditTask(task: Task) {
    setSubtasks(prev => prev.map(t => t.id === task.id ? task : t));
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id, title: task.title, description: task.description,
        priority: task.priority, status: task.status, owner: task.owner,
        category: task.category, due_date: task.due_date,
      }),
    });
  }

  async function handleDeleteTask(taskId: string) {
    setSubtasks(prev => prev.filter(t => t.id !== taskId));
    await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="text-gray-400">טוען...</div></div>;
  }

  if (!project) {
    return <div className="text-center py-20 text-gray-400">פרויקט לא נמצא</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 mb-3">
          <ArrowRight size={14} />
          חזרה לפרויקטים
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[project.priority])}>
                {project.priority.toUpperCase()}
              </span>
              <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", categoryColors[project.category])}>
                {categoryLabels[project.category]}
              </span>
              <span className="text-xs text-gray-400">{ownerIcons[project.owner]} {ownerLabels[project.owner]}</span>
            </div>
            <h1 className="text-2xl font-bold dark:text-gray-100">{project.title}</h1>
            {project.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
            )}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            <Plus size={16} />
            תת-משימה
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
        <div className="flex gap-4 mt-3 text-xs text-gray-400 dark:text-gray-500">
          {TASK_STATUSES.map(s => {
            const count = columns[s].length;
            if (!count) return null;
            return <span key={s}>{statusLabels[s]}: {count}</span>;
          })}
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          <button onClick={() => setViewMode("board")} className={clsx("p-1.5 rounded-md", viewMode === "board" ? "bg-white dark:bg-gray-600 shadow-sm" : "")}>
            <LayoutGrid size={16} className={viewMode === "board" ? "text-brand-600" : "text-gray-400"} />
          </button>
          <button onClick={() => setViewMode("list")} className={clsx("p-1.5 rounded-md", viewMode === "list" ? "bg-white dark:bg-gray-600 shadow-sm" : "")}>
            <List size={16} className={viewMode === "list" ? "text-brand-600" : "text-gray-400"} />
          </button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {TASK_STATUSES.map(status => (
            <div key={status} className="min-w-[240px] flex-1">
              <div className={clsx("rounded-t-xl px-3 py-2 text-xs font-bold", statusColors[status])}>
                <span className="dark:text-gray-200">{statusLabels[status]}</span>
                <span className="text-gray-400 dark:text-gray-500 mr-1">({columns[status].length})</span>
              </div>
              <div className="space-y-2 mt-2">
                {columns[status].map(task => (
                  <div
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[task.priority])}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">{ownerIcons[task.owner]}</span>
                    </div>
                    <p className="text-sm font-medium dark:text-gray-200">{task.title}</p>
                    {task.due_date && (
                      <p className="text-[10px] text-gray-400 mt-1">{task.due_date}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="text-right py-3 px-4 font-medium">משימה</th>
                <th className="text-center py-3 px-2 font-medium w-16">P</th>
                <th className="text-center py-3 px-2 font-medium w-16">מי</th>
                <th className="text-center py-3 px-2 font-medium w-28">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {subtasks
                .sort((a, b) => ({ p1: 0, p2: 1, p3: 2 }[a.priority] - { p1: 0, p2: 1, p3: 2 }[b.priority]))
                .map(task => (
                  <tr
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <td className={clsx("py-2.5 px-4 dark:text-gray-200", task.status === "done" && "line-through opacity-50")}>
                      {task.title}
                    </td>
                    <td className="text-center">
                      <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[task.priority])}>
                        {task.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-center">{ownerIcons[task.owner]}</td>
                    <td className="text-center">
                      <select
                        value={task.status}
                        onChange={(e) => { e.stopPropagation(); handleStatusChange(task.id, e.target.value as TaskStatus); }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-transparent border-0 text-gray-500 dark:text-gray-400 cursor-pointer"
                      >
                        {TASK_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      <TaskAddModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddSubtask} />
      <TaskEditModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleEditTask} onDelete={handleDeleteTask} />
    </div>
  );
}
