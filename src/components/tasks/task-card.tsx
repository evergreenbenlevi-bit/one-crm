"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { clsx } from "clsx";
import { Calendar, ChevronDown, ChevronUp, Trash2, ArrowRight, GripVertical, Layers } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import type { Task, TaskStatus, TaskPriority } from "@/lib/types/tasks";
import { ownerLabels, statusLabels } from "@/lib/types/tasks";
import { getProjectColor } from "@/lib/project-colors";
import { TaskSubtaskPreview } from "./task-subtask-preview";
import { checkTitleQuality } from "@/lib/task-title-quality";

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  open: "in_progress", in_progress: "waiting", waiting: "done", done: null,
};

const PRIORITY_CYCLE: Record<TaskPriority, TaskPriority> = {
  p0: "p1", p1: "p2", p2: "p3", p3: "p0",
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; cls: string }> = {
  p0: { label: "P0 אש", cls: "bg-red-600 text-white font-bold" },
  p1: { label: "P1 קריטי", cls: "bg-orange-500 text-white font-semibold" },
  p2: { label: "P2", cls: "bg-blue-600/80 text-blue-100 font-medium" },
  p3: { label: "P3", cls: "bg-gray-700 text-gray-400" },
};

const OWNER_AVATAR: Record<string, { label: string; cls: string }> = {
  ben:     { label: "בן",  cls: "bg-emerald-800 text-emerald-200 border-emerald-700" },
  claude:  { label: "AI",  cls: "bg-violet-800 text-violet-200 border-violet-700" },
  both:    { label: "✦",   cls: "bg-slate-700 text-slate-200 border-slate-600" },
  evyatar: { label: "אב",  cls: "bg-amber-800 text-amber-200 border-amber-700" },
};

function formatRelativeDate(dateStr: string): { label: string; urgent: boolean; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return { label: `⚠️ איחור ${Math.abs(diff)} ימים`, urgent: true, overdue: true };
  if (diff === 0) return { label: "היום !", urgent: true, overdue: false };
  if (diff === 1) return { label: "מחר", urgent: false, overdue: false };
  if (diff <= 7) return { label: `בעוד ${diff} ימים`, urgent: false, overdue: false };
  const months = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];
  return { label: `${d.getDate()} ${months[d.getMonth()]}`, urgent: false, overdue: false };
}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onPriorityChange?: (taskId: string, newPriority: TaskPriority) => void;
  onDelete?: (taskId: string) => void;
  onDueDateChange?: (taskId: string, newDate: string | null) => void;
  projectName?: string;
  projectColor?: string;
  subtaskCount?: number;
}

export function TaskCard({
  task,
  onEdit,
  onStatusChange,
  onPriorityChange,
  onDelete,
  onDueDateChange,
  projectName,
  projectColor,
  subtaskCount,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [undoDelete, setUndoDelete] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const nextStatus = NEXT_STATUS[task.status];
  const { isGood: titleIsGood } = checkTitleQuality(task.title);

  const projectColors = useMemo(
    () => projectColor ? { bar: projectColor, bg: 'rgba(0,0,0,0)', text: '#9CA3AF' } : getProjectColor(task.project_id),
    [projectColor, task.project_id]
  );

  const dateInfo = useMemo(
    () => task.due_date ? formatRelativeDate(task.due_date) : null,
    [task.due_date, task.status]
  );

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
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>)[`__undo_${task.id}`] = timer;
  }, [task.id, onDelete]);

  const handleUndoDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const timer = (window as unknown as Record<string, ReturnType<typeof setTimeout>>)[`__undo_${task.id}`];
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
        className="rounded-xl border border-red-900/40 bg-red-950/20 p-3 flex items-center justify-between min-h-[60px]"
      >
        <span className="text-sm text-red-400 font-medium">נמחק</span>
        <button
          onClick={handleUndoDelete}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-sm font-bold text-red-400 hover:underline px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition-colors"
        >
          בטל
        </button>
      </div>
    );
  }

  const priorityConf = PRIORITY_CONFIG[task.priority];
  const ownerConf = OWNER_AVATAR[task.owner] ?? { label: task.owner[0].toUpperCase(), cls: "bg-gray-700 text-gray-300 border-gray-600" };
  const tags = task.tags || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={clsx(
        "group relative rounded-xl bg-gray-900 border border-white/[0.07] overflow-hidden",
        "transition-all duration-150 select-none",
        isDragging
          ? "opacity-50 shadow-2xl scale-[1.03] border-white/20"
          : "hover:border-white/15 hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5"
      )}
    >
      {/* Project color bar — 4px left strip */}
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: projectColors.bar }}
        aria-hidden
      />

      {/* Drag handle — always visible */}
      <div
        {...listeners}
        className="absolute inset-y-0 left-2 flex items-center cursor-grab active:cursor-grabbing opacity-20 group-hover:opacity-60 transition-opacity z-10"
        title="גרור"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <GripVertical size={14} className="text-gray-400" />
      </div>

      {/* Inline date picker */}
      {showDatePicker && (
        <div
          className="absolute top-10 right-3 z-30"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            type="date"
            defaultValue={task.due_date || ""}
            onChange={handleDateChange}
            className="text-sm px-2 py-1.5 rounded-lg border border-white/15 bg-gray-800 text-gray-200 shadow-xl focus:ring-1 focus:ring-white/20 outline-none"
            autoFocus
            onBlur={() => setShowDatePicker(false)}
          />
        </div>
      )}

      <div className="pl-6 pr-3 pt-3 pb-3">

        {/* Row 1: Priority pill + Project pill + Date */}
        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap" dir="rtl">
          {/* Priority — big, colored, always visible */}
          <button
            onClick={handleCyclePriority}
            onPointerDown={(e) => e.stopPropagation()}
            title={`עדיפות — לחץ לשינוי`}
            className={clsx(
              "text-xs px-2 py-0.5 rounded-full transition-opacity hover:opacity-80 shrink-0",
              priorityConf.cls
            )}
          >
            {priorityConf.label}
          </button>

          {/* Domain pill — business/personal */}
          {task.domain && (
            <span
              className={clsx(
                "text-xs px-2 py-0.5 rounded-full shrink-0 font-medium",
                task.domain === "personal"
                  ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700/40"
                  : "bg-blue-900/40 text-blue-300 border border-blue-700/40"
              )}
              title={task.domain === "personal" ? "אישי" : "עסק"}
            >
              {task.domain === "personal" ? "אישי" : "עסק"}
            </span>
          )}

          {/* Project pill */}
          {projectName && (
            <span
              className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
              style={{
                backgroundColor: projectColors.bar + '22',
                color: projectColors.bar,
                border: `1px solid ${projectColors.bar}44`,
              }}
            >
              {projectName}
            </span>
          )}

          {/* Due date — relative, urgent coloring */}
          {dateInfo ? (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}
              onPointerDown={(e) => e.stopPropagation()}
              className={clsx(
                "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors shrink-0",
                dateInfo.overdue
                  ? "bg-red-900/40 text-red-300 border border-red-700/40"
                  : dateInfo.urgent
                  ? "bg-amber-900/40 text-amber-300 border border-amber-700/40"
                  : "bg-gray-800 text-gray-400 border border-white/5 hover:text-gray-200"
              )}
            >
              <Calendar size={10} />
              <span>{dateInfo.label}</span>
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-1"
            >
              + תאריך
            </button>
          )}
        </div>

        {/* Row 2: Title */}
        <p
          className="text-base font-semibold text-white leading-snug mb-1.5 line-clamp-2"
          dir="rtl"
          title={!titleIsGood ? "כותרת לא תקנית — ראה TASK-STANDARDS.md" : undefined}
          style={{ fontSize: '16px' }}
        >
          {task.title}
        </p>

        {/* Row 3: Description preview — always visible if exists */}
        {task.description && (
          <p
            className={clsx(
              "text-sm text-gray-500 leading-relaxed mb-2",
              expanded ? "line-clamp-none whitespace-pre-wrap" : "line-clamp-1"
            )}
            dir="rtl"
            style={{ fontSize: '13px' }}
          >
            {task.description}
          </p>
        )}

        {/* Row 4: Owner + Tags + Subtask count */}
        <div className="flex items-center gap-1.5 flex-wrap" dir="rtl">
          {/* Owner avatar */}
          <span
            className={clsx(
              "inline-flex items-center justify-center text-[11px] font-bold rounded-full px-2 h-5 border shrink-0",
              ownerConf.cls
            )}
            title={ownerLabels[task.owner]}
          >
            {ownerConf.label}
          </span>

          {/* Tags */}
          {tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-[11px] px-1.5 py-0 rounded-full bg-gray-800 text-gray-500 border border-white/5 font-mono">
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[11px] text-gray-600">+{tags.length - 2}</span>
          )}

          {/* Subtask count chip */}
          {(subtaskCount ?? 0) > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setSubtasksOpen(!subtasksOpen); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-white/5 hover:text-gray-200 hover:border-white/15 transition-colors ml-auto"
            >
              <Layers size={10} />
              <span>{subtaskCount} תת-משימות</span>
              {subtasksOpen ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
            </button>
          )}
        </div>

        {/* Subtask expansion */}
        <TaskSubtaskPreview taskId={task.id} isOpen={subtasksOpen} />

        {/* Action bar — compact, always visible on hover */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" dir="rtl">
          {nextStatus && onStatusChange && (
            <button
              onClick={handleAdvanceStatus}
              onPointerDown={(e) => e.stopPropagation()}
              title={`→ ${statusLabels[nextStatus]}`}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-gray-800 border border-white/10 text-gray-400 hover:text-white hover:border-white/25 transition-colors"
            >
              <ArrowRight size={10} />
              <span>{statusLabels[nextStatus]}</span>
            </button>
          )}

          {task.description && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[11px] text-gray-600 hover:text-gray-300 transition-colors px-1"
            >
              {expanded ? "סגור" : "פרטים"}
            </button>
          )}

          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-[11px] text-gray-600 hover:text-gray-200 transition-colors px-1"
            >
              ערוך
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              onPointerDown={(e) => e.stopPropagation()}
              className="mr-auto p-1 text-gray-700 hover:text-red-400 transition-colors rounded"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
