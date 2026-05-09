"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { clsx } from "clsx";
import type { Task, TaskStatus } from "@/lib/types/tasks";
import { TASK_STATUSES } from "@/lib/types/tasks";
import { TaskCard } from "./task-card";
import { projectBarColor } from "@/lib/project-colors";

// ADHD-optimized column config — big, colored, unmistakable
const COLUMN_CONFIG: Record<TaskStatus, {
  label: string;
  underline: string;
  dropBg: string;
  emptyText: string;
}> = {
  open:        { label: "פתוח",   underline: "border-blue-500",   dropBg: "bg-blue-950/20",   emptyText: "↓ גרור לכאן" },
  in_progress: { label: "בעבודה", underline: "border-amber-500",  dropBg: "bg-amber-950/20",  emptyText: "↓ גרור לכאן" },
  waiting:     { label: "ממתין",  underline: "border-purple-500", dropBg: "bg-purple-950/20", emptyText: "↓ גרור לכאן" },
  done:        { label: "הושלם",  underline: "border-green-500",  dropBg: "bg-green-950/20",  emptyText: "↓ גרור לכאן" },
};

const WIP_LIMIT = 5;

interface ProjectMeta { id: string; title: string }

interface TaskKanbanProps {
  columns: Record<TaskStatus, Task[]>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onPriorityChange?: (taskId: string, newPriority: import("@/lib/types/tasks").TaskPriority) => void;
  onDelete?: (taskId: string) => void;
  onDueDateChange?: (taskId: string, newDate: string | null) => void;
  onPositionChange?: (taskId: string, newPosition: number) => void;
  visibleStatuses?: TaskStatus[];
  projects?: ProjectMeta[];           // for project pill on cards
  subtaskCounts?: Record<string, number>; // taskId → count
}

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onDueDateChange,
  wipCount,
  projects,
  subtaskCounts,
}: {
  status: TaskStatus;
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onPriorityChange?: (taskId: string, newPriority: import("@/lib/types/tasks").TaskPriority) => void;
  onDelete?: (taskId: string) => void;
  onDueDateChange?: (taskId: string, newDate: string | null) => void;
  wipCount?: number;
  projects?: ProjectMeta[];
  subtaskCounts?: Record<string, number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const col = COLUMN_CONFIG[status];
  const isInProgress = status === "in_progress";
  const isWipFull = isInProgress && wipCount !== undefined && wipCount >= WIP_LIMIT;

  const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.title]));

  return (
    <div className="flex-shrink-0 w-[300px] min-w-[300px]">
      {/* Column header — big, colored, unmistakable */}
      <div className={clsx(
        "flex items-center justify-between mb-3 px-1 pb-2.5 border-b-[3px]",
        col.underline
      )}>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white" dir="rtl" style={{ fontSize: '22px' }}>
          {col.label}
        </h3>

        <div className="flex items-center gap-2">
          {/* WIP limit badge */}
          {isInProgress && wipCount !== undefined && (
            <span className={clsx(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              isWipFull
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-gray-700 text-gray-400"
            )}>
              {wipCount}/{WIP_LIMIT}
            </span>
          )}
          {/* Task count */}
          <span className="text-sm font-semibold text-gray-500 bg-gray-800 px-2.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Droppable column */}
      <div
        ref={setNodeRef}
        className={clsx(
          "space-y-3 min-h-[240px] p-2 rounded-xl transition-all duration-150",
          isOver
            ? `${col.dropBg} ring-2 ring-inset ring-white/10 border-2 border-dashed border-white/20`
            : "border-2 border-transparent"
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              onPriorityChange={onPriorityChange}
              onDelete={onDelete}
              onDueDateChange={onDueDateChange}
              projectName={task.project_id ? projectMap[task.project_id] : undefined}
              projectColor={task.project_id ? projectBarColor(task.project_id) : undefined}
              subtaskCount={subtaskCounts?.[task.id]}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className={clsx(
            "flex items-center justify-center h-20 rounded-lg border-2 border-dashed",
            isOver
              ? "border-white/30 text-white/60"
              : "border-white/5 text-gray-700"
          )}>
            <span className="text-sm" dir="rtl">{col.emptyText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TaskKanban({
  columns, onStatusChange, onEdit, onPriorityChange, onDelete,
  onDueDateChange, onPositionChange, visibleStatuses,
  projects, subtaskCounts,
}: TaskKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const statuses = visibleStatuses || TASK_STATUSES;
  const wipCount = columns["in_progress"]?.length || 0;
  const activeTask = activeId
    ? Object.values(columns).flat().find(t => t.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function persistPositions(items: Task[]) {
    const updates = items.map((task, index) => ({ id: task.id, position: index * 100 }));
    fetch("/api/tasks/bulk-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    }).catch(console.error);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    // Cross-column drop: over is a status ID
    if (TASK_STATUSES.includes(overId as TaskStatus)) {
      const sourceEntry = Object.entries(columns).find(([, tasks]) =>
        tasks.some(t => t.id === taskId)
      );
      const currentStatus = sourceEntry?.[0] as TaskStatus | undefined;

      if (currentStatus && currentStatus !== overId) {
        onStatusChange(taskId, overId as TaskStatus);
        fetch("/api/tasks/bulk-update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [{ id: taskId, position: 0, status: overId as TaskStatus }] }),
        }).catch(console.error);

        if (sourceEntry) {
          const sourceTasks = sourceEntry[1].filter(t => t.id !== taskId);
          if (sourceTasks.length > 0) persistPositions(sourceTasks);
        }
      }
      return;
    }

    // Within-column reorder: over is a task ID
    if (overId !== taskId) {
      const colEntry = Object.entries(columns).find(([, colTasks]) =>
        colTasks.some(t => t.id === taskId)
      );
      if (!colEntry) return;

      const colTasks = [...colEntry[1]].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const fromIdx = colTasks.findIndex(t => t.id === taskId);
      const toIdx = colTasks.findIndex(t => t.id === overId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      const reordered = [...colTasks];
      const [moved] = reordered.splice(fromIdx, 1);
      const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
      reordered.splice(insertAt, 0, moved);

      if (onPositionChange) onPositionChange(taskId, (insertAt + 1) * 100);
      persistPositions(reordered);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-5 overflow-x-auto pb-6">
        {statuses.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status] || []}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
            onPriorityChange={onPriorityChange}
            onDelete={onDelete}
            onDueDateChange={onDueDateChange}
            wipCount={status === "in_progress" ? wipCount : undefined}
            projects={projects}
            subtaskCounts={subtaskCounts}
          />
        ))}
      </div>

      {/* Drag overlay — lifted card with project color */}
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeTask && (
          <div
            className="rounded-xl bg-gray-900 border border-white/15 overflow-hidden shadow-2xl w-[300px] rotate-1 opacity-95"
            style={{ boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${projectBarColor(activeTask.project_id)}44` }}
          >
            <div className="w-full h-1" style={{ backgroundColor: projectBarColor(activeTask.project_id) }} />
            <div className="p-3">
              <p className="text-base font-semibold text-white" dir="rtl" style={{ fontSize: '16px' }}>
                {activeTask.title}
              </p>
              {activeTask.due_date && (
                <p className="text-xs text-gray-500 mt-1" dir="rtl">{activeTask.due_date}</p>
              )}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
