"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import { Calendar, ChevronDown, ChevronUp, Trash2, ArrowRight, ChevronUp as PriorityUp, ChevronDown as PriorityDown } from "lucide-react";
import { useState, useCallback } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types/tasks";
import {
  priorityColors,
  ownerIcons,
  ownerLabels,
  categoryColors,
  categoryLabels,
  statusLabels,
  effortLabels,
  effortColors,
} from "@/lib/types/tasks";

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  backlog: "todo", todo: "in_progress", in_progress: "done", waiting_ben: "in_progress", done: null,
  inbox: "up_next", up_next: "in_progress", scheduled: "in_progress", waiting: "in_progress", someday: null, archived: null,
};

const PRIORITY_CYCLE: Record<TaskPriority, TaskPriority> = {
  p0: "p1", p1: "p2", p2: "p3", p3: "p0",
};

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onPriorityChange?: (taskId: string, newPriority: TaskPriority) => void;
  onDelete?: (taskId: string) => void;
  onDueDateChange?: (taskId: string, newDate: string | null) => void;
}

export function TaskCard({ task, onEdit, onStatusChange, onPriorityChange, onDelete, onDueDateChange }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [undoDelete, setUndoDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";
  const isP1 = task.priority === "p1";
  const tags = task.tags || [];
  const nextStatus = NEXT_STATUS[task.status];

  const handleAdvanceStatus = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (nextStatus && onStatusChange) onStatusChange(task.id, nextStatus);
  }, [task.id, nextStatus, onStatusChange]);

  const handleCyclePriority = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPriorityChange) onPriorityChange(task.id, PRIORITY_CYCLE[task.priority]);
  }, [task.id, task.priority, onPriorityChange]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setUndoDelete(true);
    const timer = setTimeout(() => {
      if (onDelete) onDelete(task.id);
      setUndoDelete(false);
    }, 2500);
    // Store timer for undo
    (window as unknown as Record<string, NodeJS.Timeout>)[`__undo_${task.id}`] = timer;
  }, [task.id, onDelete]);

  const handleUndoDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const timer = (window as unknown as Record<string, NodeJS.Timeout>)[`__undo_${task.id}`];
    if (timer) clearTimeout(timer);
    setUndoDelete(false);
  }, [task.id]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onDueDateChange) onDueDateChange(task.id, e.target.value || null);
    setShowDatePicker(false);
  }, [task.id, onDueDateChange]);

  if (undoDelete) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 flex items-center justify-between"
      >
        <span className="text-xs text-red-600 dark:text-red-400 font-medium">נמחק</span>
        <button
          onClick={handleUndoDelete}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-xs font-bold text-red-700 dark:text-red-300 hover:underline px-2 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
        >
          בטל
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        "group rounded-xl shadow-sm border cursor-grab active:cursor-grabbing transition-all duration-150 overflow-hidden relative",
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

      {/* ── Hover Quick-Action Bar ── */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {/* Advance status */}
        {nextStatus && onStatusChange && (
          <button
            onClick={handleAdvanceStatus}
            onPointerDown={(e) => e.stopPropagation()}
            title={`→ ${statusLabels[nextStatus]}`}
            className="p-1 rounded-md bg-white/90 dark:bg-gray-700/90 shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/40 dark:hover:text-brand-300 transition-colors"
          >
            <ArrowRight size={11} />
          </button>
        )}
        {/* Cycle priority */}
        {onPriorityChange && (
          <button
            onClick={handleCyclePriority}
            onPointerDown={(e) => e.stopPropagation()}
            title={`עדיפות → ${PRIORITY_CYCLE[task.priority].toUpperCase()}`}
            className="p-1 rounded-md bg-white/90 dark:bg-gray-700/90 shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/40 dark:hover:text-yellow-300 transition-colors"
          >
            <PriorityUp size={11} />
          </button>
        )}
        {/* Date picker toggle */}
        {onDueDateChange && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}
            onPointerDown={(e) => e.stopPropagation()}
            title="שנה תאריך"
            className="p-1 rounded-md bg-white/90 dark:bg-gray-700/90 shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors"
          >
            <Calendar size={11} />
          </button>
        )}
        {/* Delete */}
        {onDelete && (
          <button
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            title="מחק"
            className="p-1 rounded-md bg-white/90 dark:bg-gray-700/90 shadow-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/40 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {/* Inline date picker */}
      {showDatePicker && (
        <div className="absolute top-9 left-1.5 z-20" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <input
            type="date"
            defaultValue={task.due_date || ""}
            onChange={handleDateChange}
            className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg focus:ring-2 focus:ring-brand-400 outline-none"
            autoFocus
            onBlur={() => setShowDatePicker(false)}
          />
        </div>
      )}

      {/* Hover Preview Popover */}
      {(task.description || task.due_date) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 delay-300 z-20">
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-xl px-3 py-2 text-xs">
            {task.description && (
              <p className="text-gray-200 dark:text-gray-700 line-clamp-3 leading-relaxed mb-1">{task.description}</p>
            )}
            <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
              {task.due_date && <span>דדליין: {task.due_date}</span>}
              {task.created_at && <span>נוצר: {new Date(task.created_at).toLocaleDateString("he-IL")}</span>}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
          </div>
        </div>
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

          {task.effort && (
            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded-md font-medium", effortColors[task.effort])}>
              {effortLabels[task.effort].split(" ")[0]}
            </span>
          )}

          {task.due_date && (
            <div className={clsx("flex items-center gap-0.5 text-[10px]", isOverdue ? "text-red-500 font-bold" : "text-gray-400 dark:text-gray-500")}>
              <Calendar size={9} />
              <span>{task.due_date}</span>
            </div>
          )}

          {isOverdue && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">
              פג תוקף
            </span>
          )}

          {(task.priority_score ?? 0) > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 font-mono">
              {Math.round(task.priority_score!)}
            </span>
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
