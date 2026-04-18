"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, FolderKanban, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import type { Task, TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import { priorityColors, ownerIcons, ownerLabels, categoryColors, categoryLabels } from "@/lib/types/tasks";
import { TaskAddModal } from "@/components/tasks/task-add-modal";

interface Project extends Task {
  subtasks: Task[];
  progress: { total: number; done: number };
}

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Build projects: parent tasks + their children
  const projects = useMemo(() => {
    const childMap = new Map<string, Task[]>();
    const parentIds = new Set<string>();

    // Find all tasks that are children
    tasks.forEach(t => {
      if (t.parent_id) {
        parentIds.add(t.parent_id);
        const children = childMap.get(t.parent_id) || [];
        children.push(t);
        childMap.set(t.parent_id, children);
      }
    });

    // Projects = tasks that have children OR tasks without parent_id that have no children (standalone projects)
    const projectList: Project[] = [];

    // First: actual parent tasks with children
    tasks.forEach(t => {
      if (parentIds.has(t.id)) {
        const subtasks = childMap.get(t.id) || [];
        const done = subtasks.filter(s => s.status === "done").length;
        projectList.push({ ...t, subtasks, progress: { total: subtasks.length, done } });
      }
    });

    // Sort: P1 first, then by progress (least done first)
    const pOrder: Record<string, number> = { p0: -1, p1: 0, p2: 1, p3: 2 };
    projectList.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return pOrder[a.priority] - pOrder[b.priority];
    });

    return projectList;
  }, [tasks]);

  // Standalone tasks (not part of any project)
  const standaloneTasks = useMemo(() => {
    const parentIds = new Set<string>();
    const childIds = new Set<string>();
    tasks.forEach(t => {
      if (t.parent_id) { childIds.add(t.id); parentIds.add(t.parent_id); }
    });
    return tasks.filter(t => !parentIds.has(t.id) && !childIds.has(t.id) && t.status !== "done");
  }, [tasks]);

  async function handleAddProject(taskData: {
    title: string; description: string; priority: TaskPriority;
    status: string; owner: TaskOwner; category: TaskCategory; due_date: string | null;
  }) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskData, position: 0 }),
    });
    if (res.ok) fetchTasks();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400 dark:text-gray-500">טוען פרויקטים...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">פרויקטים</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {projects.length} פרויקטים · {standaloneTasks.length} משימות עצמאיות
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
        >
          <Plus size={16} />
          פרויקט חדש
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => {
          const pct = project.progress.total > 0
            ? Math.round((project.progress.done / project.progress.total) * 100)
            : 0;
          const isDone = project.status === "done";

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={clsx(
                "bg-white dark:bg-gray-800 rounded-2xl p-5 border transition-all hover:shadow-md",
                isDone
                  ? "border-green-200 dark:border-green-800 opacity-60"
                  : "border-gray-100 dark:border-gray-700"
              )}
            >
              {/* Top: priority + category + owner */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[project.priority])}>
                    {project.priority.toUpperCase()}
                  </span>
                  <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", categoryColors[project.category])}>
                    {categoryLabels[project.category]}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500" title={ownerLabels[project.owner]}>
                  {ownerIcons[project.owner]}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-sm dark:text-gray-100 mb-1">{project.title}</h3>

              {/* Description */}
              {project.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{project.description}</p>
              )}

              {/* Progress Bar */}
              <div className="mt-auto">
                <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                  <span>{project.progress.done}/{project.progress.total} משימות</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all",
                      pct === 100 ? "bg-green-500" : pct > 50 ? "bg-brand-500" : "bg-amber-500"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Sub-task status summary */}
              <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400 dark:text-gray-500">
                <FolderKanban size={12} />
                <span>
                  {project.subtasks.filter(s => s.status === "in_progress").length} בביצוע ·{" "}
                  {project.subtasks.filter(s => s.status === "waiting_ben").length} ממתין לבן
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Standalone tasks */}
      {standaloneTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-bold dark:text-gray-100 mb-3">משימות עצמאיות ({standaloneTasks.length})</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">משימות שלא שייכות לפרויקט. ניתן להפוך אותן לפרויקט בעמוד המשימות.</p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {standaloneTasks.slice(0, 10).map(task => (
                  <tr key={task.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                    <td className="py-2 px-4">
                      <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md mr-2", priorityColors[task.priority])}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className="dark:text-gray-200">{task.title}</span>
                    </td>
                    <td className="text-center text-xs text-gray-400 dark:text-gray-500 w-16">{ownerIcons[task.owner]}</td>
                    <td className="text-center w-24">
                      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", categoryColors[task.category])}>
                        {categoryLabels[task.category]}
                      </span>
                    </td>
                  </tr>
                ))}
                {standaloneTasks.length > 10 && (
                  <tr>
                    <td colSpan={3} className="py-2 px-4 text-xs text-gray-400 text-center">
                      +{standaloneTasks.length - 10} נוספות — ראה בעמוד המשימות
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TaskAddModal open={showAddModal} onClose={() => setShowAddModal(false)} onSave={handleAddProject} />
    </div>
  );
}
