"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import type { TaskPriority, TaskOwner, TaskCategory } from "@/lib/types/tasks";
import { priorityLabels, ownerLabels, categoryLabels } from "@/lib/types/tasks";

interface ProjectOption { id: string; title: string }

interface TaskFiltersProps {
  priority: TaskPriority | "all";
  owner: TaskOwner | "all";
  category: TaskCategory | "all";
  projectId: string | "all";
  onPriorityChange: (v: TaskPriority | "all") => void;
  onOwnerChange: (v: TaskOwner | "all") => void;
  onCategoryChange: (v: TaskCategory | "all") => void;
  onProjectChange: (v: string | "all") => void;
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
        "text-sm px-3 py-1.5 rounded-lg border border-white/10",
        "bg-gray-800 text-gray-200",
        "focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none",
        "transition-colors hover:border-white/20"
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

export function TaskFilters({
  priority, owner, category, projectId,
  onPriorityChange, onOwnerChange, onCategoryChange, onProjectChange,
  hideOwner,
}: TaskFiltersProps) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    fetch("/api/projects?status=active")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {});
  }, []);

  const hasFilters = priority !== "all" || owner !== "all" || category !== "all" || projectId !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      <FilterSelect label="עדיפות" value={priority} options={priorityLabels} onChange={onPriorityChange} />
      {!hideOwner && <FilterSelect label="אחראי" value={owner} options={ownerLabels} onChange={onOwnerChange} />}
      <FilterSelect label="קטגוריה" value={category} options={categoryLabels} onChange={onCategoryChange} />

      {/* Project filter */}
      {projects.length > 0 && (
        <select
          value={projectId}
          onChange={(e) => onProjectChange(e.target.value)}
          className={clsx(
            "text-sm px-3 py-1.5 rounded-lg border border-white/10",
            "bg-gray-800 text-gray-200",
            "focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none",
            "transition-colors hover:border-white/20",
            projectId !== "all" && "border-blue-500/40 text-blue-300"
          )}
          aria-label="פרויקט"
        >
          <option value="all">פרויקט: הכל</option>
          <option value="none">ללא פרויקט</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            onPriorityChange("all");
            onOwnerChange("all");
            onCategoryChange("all");
            onProjectChange("all");
          }}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors px-1"
        >
          נקה
        </button>
      )}
    </div>
  );
}
