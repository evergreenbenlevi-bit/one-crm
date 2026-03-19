"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import { Calendar, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { useState } from "react";
import type { Task } from "@/lib/types/tasks";
import {
  priorityColors,
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

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
  const isP1 = task.priority === "p1";
  const tags = task.tags || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all duration-150 overflow-hidden relative",
        isDragging ? "opacity-50 shadow-xl scale-105" : "hover:shadow-md hover:-translate-y-0.5",
        isP1
          ? "bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-gray-800 border-red-100 dark:border-red-900/40"
          : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700",
        isOverdue && !isP1 && "border-red-200 dark:border-red-800"
      )}
    >
      {/* P1 accent bar */}
      {isP1 && (
        <div className="absolute top-0 right-0 bottom-0 w-[3px] bg-gradient-to-b from-red-400 to-red-600" />
      )}

      <div className="p-3">
        {/* Header: priority + owner */}
        <div className="flex items-center justify-between mb-2">
          <span className={clsx("text-[10px] font-bold px-1.5 py-0.5 rounded-md", priorityColors[task.priority])}>
            {task.priority.toUpperCase()}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500" title={ownerLabels[task.owner]}>
            {ownerIcons[task.owner]}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium dark:text-gray-200 leading-snug mb-2">
          {isOverdue && <span className="mr-1">🔴</span>}{task.title}
        </p>

        {/* Category + due date row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", categoryColors[task.category])}>
            {categoryLabels[task.category]}
          </span>

          {task.due_date && (
            <div className={clsx("flex items-center gap-0.5 text-[10px]", isOverdue ? "text-red-500 font-bold" : "text-gray-400 dark:text-gray-500")}>
              <Calendar size={9} />
              <span>{task.due_date}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-1.5">
            {tags.map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full font-mono">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Expand description */}
        {task.description && (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-0.5 mt-2 text-[10px] text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? "סגור" : "פרטים"}
          </button>
        )}
        {expanded && task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed whitespace-pre-wrap border-t border-gray-100 dark:border-gray-700 pt-1.5">
            {task.description}
          </p>
        )}

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-2 text-[10px] text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
          >
            ערוך
          </button>
        )}
      </div>
    </div>
  );
}
