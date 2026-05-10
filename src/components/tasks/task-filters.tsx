"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { X, ChevronDown } from "lucide-react";
import type { TaskPriority, TaskOwner, TaskCategory, TaskImpact, TaskSize } from "@/lib/types/tasks";
import {
  priorityLabels, ownerLabels, categoryLabels,
  impactLabels, impactColors, IMPACT_OPTIONS,
  sizeLabels, sizeColors, SIZE_OPTIONS,
} from "@/lib/types/tasks";

interface ProjectOption { id: string; title: string }

export type SortBy = "impact" | "due_date" | "position" | "created_at" | "estimated_minutes" | "priority_score";

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
  // new
  filterImpact?: TaskImpact | "all";
  setFilterImpact?: (v: TaskImpact | "all") => void;
  filterSize?: TaskSize | "all";
  setFilterSize?: (v: TaskSize | "all") => void;
  sortBy?: SortBy;
  setSortBy?: (v: SortBy) => void;
  filterDueDateFrom?: string;
  setFilterDueDateFrom?: (v: string) => void;
  filterDueDateTo?: string;
  setFilterDueDateTo?: (v: string) => void;
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

const SORT_OPTIONS: { id: SortBy; label: string }[] = [
  { id: "priority_score", label: "עדיפות" },
  { id: "impact",         label: "השפעה" },
  { id: "due_date",       label: "דדליין" },
  { id: "estimated_minutes", label: "זמן" },
  { id: "created_at",    label: "נוצר" },
  { id: "position",      label: "מיקום" },
];

export function TaskFilters({
  priority, owner, category, projectId,
  onPriorityChange, onOwnerChange, onCategoryChange, onProjectChange,
  hideOwner,
  filterImpact = "all",
  setFilterImpact,
  filterSize = "all",
  setFilterSize,
  sortBy,
  setSortBy,
  filterDueDateFrom = "",
  setFilterDueDateFrom,
  filterDueDateTo = "",
  setFilterDueDateTo,
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

  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasFilters =
    priority !== "all" || owner !== "all" || category !== "all" || projectId !== "all" ||
    filterImpact !== "all" || filterSize !== "all" ||
    !!filterDueDateFrom || !!filterDueDateTo;

  function clearAll() {
    onPriorityChange("all");
    onOwnerChange("all");
    onCategoryChange("all");
    onProjectChange("all");
    setFilterImpact?.("all");
    setFilterSize?.("all");
    setFilterDueDateFrom?.("");
    setFilterDueDateTo?.("");
  }

  // Active filter chips
  const chips: { label: string; onRemove: () => void }[] = [];
  if (priority !== "all") chips.push({ label: `עדיפות: ${priorityLabels[priority]}`, onRemove: () => onPriorityChange("all") });
  if (owner !== "all") chips.push({ label: `אחראי: ${ownerLabels[owner]}`, onRemove: () => onOwnerChange("all") });
  if (category !== "all") chips.push({ label: `קטגוריה: ${categoryLabels[category]}`, onRemove: () => onCategoryChange("all") });
  if (projectId !== "all" && projectId !== "none") {
    const proj = projects.find(p => p.id === projectId);
    chips.push({ label: `פרויקט: ${proj?.title ?? projectId}`, onRemove: () => onProjectChange("all") });
  } else if (projectId === "none") {
    chips.push({ label: "ללא פרויקט", onRemove: () => onProjectChange("all") });
  }
  if (filterImpact !== "all") chips.push({ label: `השפעה: ${impactLabels[filterImpact]}`, onRemove: () => setFilterImpact?.("all") });
  if (filterSize !== "all") chips.push({ label: `גודל: ${sizeLabels[filterSize]}`, onRemove: () => setFilterSize?.("all") });
  if (filterDueDateFrom) chips.push({ label: `מ: ${filterDueDateFrom}`, onRemove: () => setFilterDueDateFrom?.("") });
  if (filterDueDateTo) chips.push({ label: `עד: ${filterDueDateTo}`, onRemove: () => setFilterDueDateTo?.("") });

  return (
    <div className="flex flex-col gap-2 w-full" dir="rtl">
      {/* Active filter chips row */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-200 border border-white/10"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label={`הסר פילטר ${chip.label}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={clearAll}
            className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors px-1"
          >
            נקה הכל
          </button>
        </div>
      )}

      {/* Mobile filter toggle */}
      <button
        onClick={() => setFiltersOpen(v => !v)}
        className="sm:hidden flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        פילטרים
        <ChevronDown size={12} className={clsx("transition-transform", filtersOpen && "rotate-180")} />
      </button>

      {/* Filter controls row */}
      <div className={clsx("flex flex-wrap items-center gap-2", !filtersOpen && "hidden sm:flex")}>
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

        {/* Impact pills */}
        {setFilterImpact && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-500">השפעה:</span>
            {IMPACT_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setFilterImpact(filterImpact === opt ? "all" : opt)}
                className={clsx(
                  "text-[11px] px-2 py-0.5 rounded-full border transition-colors font-medium",
                  filterImpact === opt
                    ? impactColors[opt]
                    : "border-white/10 bg-gray-800 text-gray-400 hover:text-gray-200"
                )}
              >
                {impactLabels[opt]}
              </button>
            ))}
          </div>
        )}

        {/* Size pills */}
        {setFilterSize && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-500">גודל:</span>
            {SIZE_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setFilterSize(filterSize === opt ? "all" : opt)}
                className={clsx(
                  "text-[11px] px-2 py-0.5 rounded-full border transition-colors font-medium",
                  filterSize === opt
                    ? sizeColors[opt]
                    : "border-white/10 bg-gray-800 text-gray-400 hover:text-gray-200"
                )}
              >
                {sizeLabels[opt]}
              </button>
            ))}
          </div>
        )}

        {/* Due date range */}
        {(setFilterDueDateFrom || setFilterDueDateTo) && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500">תאריך:</span>
            {setFilterDueDateFrom && (
              <input
                type="date"
                value={filterDueDateFrom}
                onChange={(e) => setFilterDueDateFrom(e.target.value)}
                className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-gray-800 text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40"
                aria-label="מתאריך"
              />
            )}
            {setFilterDueDateTo && (
              <>
                <span className="text-xs text-gray-500">—</span>
                <input
                  type="date"
                  value={filterDueDateTo}
                  onChange={(e) => setFilterDueDateTo(e.target.value)}
                  className="text-xs px-2 py-1 rounded-lg border border-white/10 bg-gray-800 text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/40"
                  aria-label="עד תאריך"
                />
              </>
            )}
          </div>
        )}

        {/* Sort selector */}
        {setSortBy && sortBy && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">מיון:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className={clsx(
                "text-sm px-3 py-1.5 rounded-lg border border-white/10",
                "bg-gray-800 text-gray-200",
                "focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 outline-none",
                "transition-colors hover:border-white/20"
              )}
              aria-label="מיון"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
