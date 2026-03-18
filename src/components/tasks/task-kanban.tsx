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
import { statusLabels, statusColors, TASK_STATUSES } from "@/lib/types/tasks";
import { TaskCard } from "./task-card";

interface TaskKanbanProps {
  columns: Record<TaskStatus, Task[]>;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  visibleStatuses?: TaskStatus[];
}

function KanbanColumn({ status, tasks, onEdit }: { status: TaskStatus; tasks: Task[]; onEdit?: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex-shrink-0 w-72">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{statusLabels[status]}</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={clsx(
          "space-y-2 min-h-[200px] p-2 rounded-xl transition-colors",
          isOver ? "bg-brand-50 dark:bg-brand-900/20" : statusColors[status]
        )}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => <TaskCard key={task.id} task={task} onEdit={onEdit} />)}
        </SortableContext>
      </div>
    </div>
  );
}

export function TaskKanban({ columns, onStatusChange, onEdit, visibleStatuses }: TaskKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const statuses = visibleStatuses || TASK_STATUSES;

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

    // Check if dropped on a column
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
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map(status => (
          <KanbanColumn key={status} status={status} tasks={columns[status] || []} onEdit={onEdit} />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-lg border border-brand-200 dark:border-brand-700 w-72">
            <span className="text-sm font-medium dark:text-gray-200">{activeTask.title}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
