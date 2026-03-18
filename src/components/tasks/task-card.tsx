"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { Task } from "@/lib/types/tasks";
import {
  priorityColors,
  priorityLabels,
  ownerIcons,
  ownerLabels,
  categoryColors,
  categoryLabels,
} from "@/lib/types/tasks";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
}

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm dark:shadow-gray-900/20 border cursor-grab active:cursor-grabbing transition-shadow",
        isDragging ? "opacity-50 shadow-lg" : "hover:shadow-md",
        isOverdue ? "border-danger" : "border-gray-100 dark:border-gray-700"
      )}
    >
      {/* Header: priority + owner */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[task.priority])}>
          {task.priority.toUpperCase()}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500" title={ownerLabels[task.owner]}>
          {ownerIcons[task.owner]}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium dark:text-gray-200 leading-snug mb-1.5">
        {isOverdue && "🔴 "}{task.title}
      </p>

      {/* Category badge */}
      <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", categoryColors[task.category])}>
        {categoryLabels[task.category]}
      </span>

      {/* Due date */}
      {task.due_date && (
        <div className={clsx("flex items-center gap-1 mt-1.5 text-[10px]", isOverdue ? "text-danger font-bold" : "text-gray-400 dark:text-gray-500")}>
          <Calendar size={10} />
          <span>{task.due_date}</span>
        </div>
      )}

      {/* Expand description */}
      {task.description && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center gap-0.5 mt-1.5 text-[10px] text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
        >
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? "סגור" : "פרטים"}
        </button>
      )}
      {expanded && task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed whitespace-pre-wrap">
          {task.description}
        </p>
      )}

      {/* Edit button */}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-2 text-[10px] text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          ערוך
        </button>
      )}
    </div>
  );
}
