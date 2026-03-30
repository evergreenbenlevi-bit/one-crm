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
import { ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import type { Task, TaskStatus } from "@/lib/types/tasks";
import { statusLabels, statusColors, statusAccent, TASK_STATUSES } from "@/lib/types/tasks";
import { TaskCard } from "./task-card";

const WIP_LIMIT = 5;

interface TaskKanbanProps {
  columns: Record<TaskStatus, Task[]>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onPriorityChange?: (taskId: string, newPriority: import("@/lib/types/tasks").TaskPriority) => void;
  onDelete?: (taskId: string) => void;
  onDueDateChange?: (taskId: string, newDate: string | null) => void;
  visibleStatuses?: TaskStatus[];
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
}: {
  status: TaskStatus;
  tasks: Task[];
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onPriorityChange?: (taskId: string, newPriority: import("@/lib/types/tasks").TaskPriority) => void;
  onDelete?: (taskId: string) => void;
  onDueDateChange?: (taskId: string, newDate: string | null) => void;
  wipCount?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const isBacklog = status === "backlog";
  const isInProgress = status === "in_progress";
  const [backlogExpanded, setBacklogExpanded] = useState(false);

  const displayTasks = isBacklog && !backlogExpanded ? [] : tasks;
  const isWipFull = isInProgress && wipCount !== undefined && wipCount >= WIP_LIMIT;

  return (
    <div className="flex-shrink-0 w-[280px]">
      {/* Column header */}
      <div
        className={clsx(
          "flex items-center justify-between mb-3 px-2 py-2 rounded-xl transition-colors",
          isBacklog && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50",
          isOver && "bg-brand-50 dark:bg-brand-900/20"
        )}
        onClick={isBacklog ? () => setBacklogExpanded(e => !e) : undefined}
      >
        <div className="flex items-center gap-2">
          {/* Status accent dot */}
          <div className={clsx("w-2 h-2 rounded-full flex-shrink-0", statusAccent[status])} />
          {isBacklog && (
            backlogExpanded
              ? <ChevronDown size={13} className="text-gray-400" />
              : <ChevronRight size={13} className="text-gray-400" />
          )}
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{statusLabels[status]}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* WIP counter for in_progress */}
          {isInProgress && (
            <span className={clsx(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
              isWipFull
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            )}>
              {wipCount}/{WIP_LIMIT}
            </span>
          )}
          <span className={clsx(
            "text-xs px-2 py-0.5 rounded-full font-semibold",
            isBacklog
              ? "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
          )}>
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Collapsed backlog */}
      {isBacklog && !backlogExpanded && (
        <div
          ref={setNodeRef}
          onClick={() => setBacklogExpanded(true)}
          className={clsx(
            "flex items-center justify-center gap-2 min-h-[60px] p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all",
            isOver
              ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20"
              : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
          )}
        >
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {tasks.length > 0 ? `${tasks.length} משימות — לחץ להרחבה` : "ריק"}
          </span>
        </div>
      )}

      {/* Expanded column */}
      {(!isBacklog || backlogExpanded) && (
        <div
          ref={setNodeRef}
          className={clsx(
            "space-y-2 min-h-[200px] p-2 rounded-xl transition-all",
            isOver
              ? "bg-brand-50 dark:bg-brand-900/20 ring-2 ring-brand-200 dark:ring-brand-800"
              : statusColors[status]
          )}
        >
          <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {displayTasks.map(task => (
              <TaskCard key={task.id} task={task} onEdit={onEdit} onStatusChange={onStatusChange} onPriorityChange={onPriorityChange} onDelete={onDelete} onDueDateChange={onDueDateChange} />
            ))}
          </SortableContext>

          {displayTasks.length === 0 && (
            <div className="flex items-center justify-center h-16 text-xs text-gray-300 dark:text-gray-600">
              גרור משימה לכאן
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TaskKanban({ columns, onStatusChange, onEdit, onPriorityChange, onDelete, onDueDateChange, visibleStatuses }: TaskKanbanProps) {
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    if (TASK_STATUSES.includes(overId as TaskStatus)) {
      const currentStatus = Object.entries(columns).find(([, tasks]) =>
        tasks.some(t => t.id === taskId)
      )?.[0] as TaskStatus | undefined;

      if (currentStatus && currentStatus !== overId) {
        onStatusChange(taskId, overId as TaskStatus);
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6">
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
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
        {activeTask && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-2xl border-2 border-brand-200 dark:border-brand-700 w-[280px] rotate-1 opacity-95">
            <span className="text-sm font-medium dark:text-gray-200">{activeTask.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
