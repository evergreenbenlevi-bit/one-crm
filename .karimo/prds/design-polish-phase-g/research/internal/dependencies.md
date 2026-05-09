# Dependencies — design-polish-phase-g
# Internal Research: Component Relationships & Import Graph
# Date: 2026-05-10

## task-card.tsx Dependencies

### Imports
```tsx
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
```

### Consumed By
- `task-kanban.tsx` — renders TaskCard per task in each column
- Potentially `task-pillars.tsx` — not confirmed (pillars has own inline card)

### Critical Constraint
- Uses `@dnd-kit/sortable` — `useSortable` hook requires `setNodeRef`, `attributes`, `listeners` on root div
- Root div has `ref={setNodeRef}` and `style={style}` — these must stay on outermost element
- Any responsive wrapper must go INSIDE root div or be the root itself

## project-timeline.tsx Dependencies

### Imports
```tsx
import { useMemo } from "react";
import { clsx } from "clsx";
import type { Task } from "@/lib/types/tasks";
import { priorityColors } from "@/lib/types/tasks";
```

### Consumed By
- Project detail page (src/app/(dashboard)/projects/[id]/page.tsx or similar)
- Receives `tasks: Task[]` prop

### Structure (already correct for mobile)
- Outer: `overflow-x-auto -mx-1 px-1` (line 42)
- Inner: `min-w-[560px]` (line 43)
- No changes needed — overflow already handled

## task-filters.tsx Dependencies

### Imports
```tsx
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { TaskPriority, TaskOwner, TaskCategory, TaskImpact, TaskSize } from "@/lib/types/tasks";
import { priorityLabels, ownerLabels, categoryLabels, impactLabels, impactColors, IMPACT_OPTIONS, sizeLabels, sizeColors, SIZE_OPTIONS } from "@/lib/types/tasks";
```

### Consumed By
- `src/app/(dashboard)/tasks/page.tsx` line 1227: `<TaskFilters ... />`
- Passes 15+ props including optional filter setters
- Parent conditionally passes `setFilterImpact`, `setFilterSize`, `setSortBy`, date range setters

### Props Interface (15 props, 9 optional)
```tsx
interface TaskFiltersProps {
  priority, owner, category, projectId          // required
  onPriorityChange, onOwnerChange, onCategoryChange, onProjectChange  // required
  hideOwner?                                    // optional
  filterImpact?, setFilterImpact?               // optional pair
  filterSize?, setFilterSize?                   // optional pair
  sortBy?, setSortBy?                           // optional pair
  filterDueDateFrom?, setFilterDueDateFrom?     // optional pair
  filterDueDateTo?, setFilterDueDateTo?         // optional pair
}
```
- Collapse behavior must be internal state — no prop changes needed for basic mobile collapse

## empty-state.tsx Dependencies

### Imports
```tsx
import { LucideIcon } from "lucide-react";
import clsx from "clsx";
```

### Consumed By (confirmed)
- `src/app/(dashboard)/tasks/page.tsx` line 18 — imported
- Usage: EmptyState with icon, title, optional description/action

### Props Interface
```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; };
  className?: string;
  compact?: boolean;
}
```
- Safe to enhance visually — no structural prop changes needed

## Tasks Page (dashboard/tasks/page.tsx)

### Key Layout Context
- Line 1202: `flex items-center gap-2 flex-wrap` — outer filter+view control row
- Line 1227: `<TaskFilters ... />` — filters rendered inline in flex row
- Line 1357: `overflow-x-auto -mx-4 px-4` — kanban view has its own overflow wrapper
- No `container` or `max-w` constraint on tasks page — full width

### View Modes Found
- Tab navigation at line 1167: tabs for different views
- Kanban view uses `overflow-x-auto` (line 1357)
- List view exists (table-based, line 322-331)

## Tailwind Config Dependencies
- `bg-brand-600`, `bg-brand-700` — custom color token (must not remove)
- `text-brand-400`, `text-brand-600` — custom color token
- No `safelist` needed — all classes are literal strings in code
