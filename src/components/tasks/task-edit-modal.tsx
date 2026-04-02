"use client";

import { useState, useEffect } from "react";
import { X, Trash2, FileText, MessageSquare } from "lucide-react";
import { clsx } from "clsx";
import type { Task, TaskPriority, TaskOwner, TaskCategory, TaskStatus } from "@/lib/types/tasks";
import { priorityLabels, ownerLabels, categoryLabels, statusLabels, TASK_STATUSES, CRM_CATEGORIES } from "@/lib/types/tasks";
import { TagInput } from "./tag-input";
import { TaskActivityTimeline } from "./task-activity-timeline";

type ModalTab = "details" | "conversation";

interface TaskEditModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskEditModal({ task, onClose, onSave, onDelete }: TaskEditModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("p2");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [owner, setOwner] = useState<TaskOwner>("claude");
  const [category, setCategory] = useState<TaskCategory>("one_tm");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurPattern, setRecurPattern] = useState("weekly:0");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setPriority(task.priority);
      setStatus(task.status);
      setOwner(task.owner);
      setCategory(task.category);
      setDueDate(task.due_date || "");
      setTags(task.tags || []);
      setIsRecurring(task.is_recurring || false);
      setRecurPattern(task.recur_pattern || "weekly:0");
      setActiveTab("details");
    }
  }, [task]);

  if (!task) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ ...task!, title: title.trim(), description: description.trim() || null, priority, status, owner, category, due_date: dueDate || null, tags, is_recurring: isRecurring, recur_pattern: isRecurring ? recurPattern : null, recur_next_at: task!.recur_next_at });
    onClose();
  }

  const fieldClass = clsx(
    "w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600",
    "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200",
    "focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none transition-shadow"
  );

  const labelClass = "text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-bold dark:text-gray-100 truncate flex-1 ml-2">{title || "עריכת משימה"}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { onDelete(task.id); onClose(); }}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
              title="מחק משימה"
            >
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          {([
            { id: "details" as const, icon: FileText, label: "פרטים" },
            { id: "conversation" as const, icon: MessageSquare, label: "שיחה" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all",
                activeTab === id
                  ? "border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === "details" && (
            <>
              {/* Meta info */}
              <div className="px-5 pt-3 pb-0 text-[10px] text-gray-400 dark:text-gray-500 flex gap-3">
                {task.source && <span>מקור: {task.source}</span>}
                {task.created_at && <span>נוצר: {new Date(task.created_at).toLocaleDateString("he-IL")}</span>}
                {task.updated_at && <span>עודכן: {new Date(task.updated_at).toLocaleDateString("he-IL")}</span>}
              </div>

              <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                <div>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={clsx(fieldClass, "font-medium")} required />
                </div>

                <div>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={clsx(fieldClass, "resize-none")} placeholder="פרטים..." />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>עדיפות</label>
                    <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={fieldClass}>
                      {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>אחראי</label>
                    <select value={owner} onChange={(e) => setOwner(e.target.value as TaskOwner)} className={fieldClass}>
                      {Object.entries(ownerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>קטגוריה</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className={fieldClass}>
                      {CRM_CATEGORIES.map(k => <option key={k} value={k}>{categoryLabels[k]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>סטטוס</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={fieldClass}>
                      {TASK_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>דדליין</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldClass} />
                </div>

                <div>
                  <label className={labelClass}>תגיות</label>
                  <TagInput tags={tags} onChange={setTags} />
                </div>

                {/* Recurring */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                    />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">משימה חוזרת</span>
                  </label>
                  {isRecurring && (
                    <select value={recurPattern} onChange={(e) => setRecurPattern(e.target.value)} className={fieldClass}>
                      <option value="daily">כל יום</option>
                      <option value="weekly:0">כל שבוע — ראשון</option>
                      <option value="weekly:1">כל שבוע — שני</option>
                      <option value="weekly:2">כל שבוע — שלישי</option>
                      <option value="weekly:3">כל שבוע — רביעי</option>
                      <option value="weekly:4">כל שבוע — חמישי</option>
                      <option value="weekly:5">כל שבוע — שישי</option>
                      <option value="weekly:6">כל שבוע — שבת</option>
                      <option value="monthly:1">כל חודש — תאריך 1</option>
                      <option value="monthly:15">כל חודש — תאריך 15</option>
                      <option value="monthly:28">כל חודש — תאריך 28</option>
                    </select>
                  )}
                </div>

                <button type="submit" className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-sm font-bold transition-colors">
                  שמור שינויים
                </button>
              </form>
            </>
          )}

          {activeTab === "conversation" && (
            <TaskActivityTimeline taskId={task.id} />
          )}
        </div>
      </div>
    </div>
  );
}
