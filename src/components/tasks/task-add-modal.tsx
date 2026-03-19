"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import type { TaskPriority, TaskOwner, TaskCategory, TaskStatus } from "@/lib/types/tasks";
import { priorityLabels, ownerLabels, categoryLabels, statusLabels, TASK_STATUSES } from "@/lib/types/tasks";
import { TagInput } from "./tag-input";

interface TaskAddModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    owner: TaskOwner;
    category: TaskCategory;
    due_date: string | null;
    tags: string[];
  }) => void;
  initialStatus?: TaskStatus;
}

export function TaskAddModal({ open, onClose, onSave, initialStatus = "todo" }: TaskAddModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("p2");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [owner, setOwner] = useState<TaskOwner>("claude");
  const [category, setCategory] = useState<TaskCategory>("one_tm");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), priority, status, owner, category, due_date: dueDate || null, tags });
    setTitle(""); setDescription(""); setPriority("p2"); setStatus(initialStatus);
    setOwner("claude"); setCategory("one_tm"); setDueDate(""); setTags([]);
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
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-base font-bold dark:text-gray-100">✦ משימה חדשה</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="שם המשימה..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className={clsx(fieldClass, "font-medium")}
              required
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              placeholder="פרטים נוספים (אופציונלי)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={clsx(fieldClass, "resize-none")}
            />
          </div>

          {/* Priority + Owner */}
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

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>קטגוריה</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className={fieldClass}>
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>סטטוס</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={fieldClass}>
                {TASK_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Due date + Tags */}
          <div>
            <label className={labelClass}>דדליין</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldClass} />
          </div>

          <div>
            <label className={labelClass}>תגיות</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-sm font-bold transition-colors"
          >
            הוסף משימה
          </button>
        </form>
      </div>
    </div>
  );
}
