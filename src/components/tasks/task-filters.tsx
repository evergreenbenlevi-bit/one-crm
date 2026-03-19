"use client";

import { clsx } from "clsx";
import type { TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import { priorityLabels, ownerLabels, categoryLabels } from "@/lib/types/tasks";

interface TaskFiltersProps {
  priority: TaskPriority | "all";
  owner: TaskOwner | "all";
  category: TaskCategory | "all";
  onPriorityChange: (v: TaskPriority | "all") => void;
  onOwnerChange: (v: TaskOwner | "all") => void;
  onCategoryChange: (v: TaskCategory | "all") => void;
  hideOwner?: boolean;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | "all";
  options: Record<T, string>;
  onChange: (v: T | "all") => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T | "all")}
      className={clsx(
        "text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600",
        "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200",
        "focus:ring-2 focus:ring-brand-400 focus:border-transparent"
      )}
      aria-label={label}
    >
      <option value="all">{label}: הכל</option>
      {Object.entries(options).map(([key, lbl]) => (
        <option key={key} value={key}>{lbl as string}</option>
      ))}
    </select>
  );
}

export function TaskFilters({ priority, owner, category, onPriorityChange, onOwnerChange, onCategoryChange, hideOwner }: TaskFiltersProps) {
  const hasFilters = priority !== "all" || owner !== "all" || category !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect label="עדיפות" value={priority} options={priorityLabels} onChange={onPriorityChange} />
      {!hideOwner && <FilterSelect label="אחראי" value={owner} options={ownerLabels} onChange={onOwnerChange} />}
      <FilterSelect label="קטגוריה" value={category} options={categoryLabels} onChange={onCategoryChange} />
      {hasFilters && (
        <button
          onClick={() => { onPriorityChange("all"); onOwnerChange("all"); onCategoryChange("all"); }}
          className="text-xs text-brand-500 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          נקה פילטרים
        </button>
      )}
    </div>
  );
}
