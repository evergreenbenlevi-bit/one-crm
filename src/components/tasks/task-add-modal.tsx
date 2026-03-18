"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import type { TaskPriority, TaskOwner, TaskCategory, TaskStatus } from "@/lib/types/tasks";
import { priorityLabels, ownerLabels, categoryLabels, statusLabels, TASK_STATUSES } from "@/lib/types/tasks";

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

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      owner,
      category,
      due_date: dueDate || null,
    });
    // Reset
    setTitle("");
    setDescription("");
    setPriority("p2");
    setStatus(initialStatus);
    setOwner("claude");
    setCategory("one_tm");
    setDueDate("");
    onClose();
  }

  const selectClass = clsx(
    "w-full text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600",
    "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200",
    "focus:ring-2 focus:ring-brand-400 focus:border-transparent"
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-gray-100">משימה חדשה</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {/* Title */}
          <input
            type="text"
            placeholder="שם המשימה..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className={selectClass}
            required
          />

          {/* Description */}
          <textarea
            placeholder="פרטים נוספים (אופציונלי)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={selectClass}
          />

          {/* Row: Priority + Owner */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">עדיפות</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectClass}>
                {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">אחראי</label>
              <select value={owner} onChange={(e) => setOwner(e.target.value as TaskOwner)} className={selectClass}>
                {Object.entries(ownerLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Category + Status */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">קטגוריה</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className={selectClass}>
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">סטטוס</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={selectClass}>
                {TASK_STATUSES.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">דדליין</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={selectClass} />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors"
          >
            הוסף משימה
          </button>
        </form>
      </div>
    </div>
  );
}
