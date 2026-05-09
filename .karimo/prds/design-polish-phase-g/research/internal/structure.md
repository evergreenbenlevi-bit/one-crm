# Structure — design-polish-phase-g
# Internal Research: File Structure & Component Anatomy
# Date: 2026-05-10

## Files In Scope

```
src/components/tasks/
├── task-card.tsx         384 lines  — primary card component (DnD-enabled)
├── task-filters.tsx      290 lines  — filter controls bar
├── empty-state.tsx        44 lines  — empty state display
├── task-kanban.tsx       ~270 lines — kanban board (has overflow-x-auto)
├── task-pillars.tsx      ~230 lines — pillar view (has md: responsive)
├── task-subtask-preview.tsx         — sub-component used by task-card
├── task-add-modal.tsx               — modal (light/dark mixed)
├── task-edit-modal.tsx              — modal (light/dark mixed)
├── task-import-modal.tsx            — modal (light/dark mixed)
├── bulk-action-bar.tsx              — selection bar
├── big3-today.tsx                   — today's top 3 widget
├── eod-panel.tsx                    — end-of-day panel
├── weekly-capacity-view.tsx         — weekly view
├── active-sessions.tsx              — active sessions widget
└── tag-input.tsx                    — tag input component

src/components/projects/
└── project-timeline.tsx  127 lines  — Gantt-style timeline (ALREADY has overflow fix)

src/app/(dashboard)/tasks/
└── page.tsx              ~1400 lines — tasks page (main consumer)
```

## task-card.tsx Anatomy (by line range)

```
Lines   1–13   — imports
Lines  14–35   — STATUS/PRIORITY/OWNER constants
Lines  36–48   — formatRelativeDate() helper
Lines  50–60   — TaskCardProps interface
Lines  62–92   — component state + DnD setup
Lines  94–125  — event handlers (advance status, priority, delete, date)
Lines 127–144  — undoDelete rendering branch
Lines 146–148  — local variable setup
Lines 150–162  — root div (DnD node ref, styling)
Lines 163–168  — project color bar (left strip)
Lines 170–178  — drag handle
Lines 180–196  — inline date picker
Lines 198–380  — main content (pl-6 pr-3 pt-3 pb-3)
  Lines 200–270  — Row 1: priority + domain + project + date pills
  Lines 272–279  — Row 2: title
  Lines 281–294  — Row 3: description preview
  Lines 296–331  — Row 4: owner + tags + subtask count
  Lines 333–334  — subtask expansion
  Lines 336–379  — action bar (opacity-0 group-hover issue)
Lines 382–383  — closing tags
```

## task-filters.tsx Anatomy (by line range)

```
Lines   1–11   — imports
Lines  13–38   — props interfaces (TaskFiltersProps, SortBy)
Lines  40–69   — FilterSelect<T> generic component
Lines  71–78   — SORT_OPTIONS constant
Lines  80–94   — component props destructuring
Lines  95–104  — project fetch effect
Lines 106–120  — hasFilters + clearAll logic
Lines 122–136  — active chips builder
Lines 138–165  — active filter chips row (flex-wrap)
Lines 167–286  — filter controls row (flex flex-wrap)
  Lines 169–171  — priority + owner + category selects
  Lines 173–193  — project select (conditional)
  Lines 195–214  — impact pills (conditional)
  Lines 216–235  — size pills (conditional)
  Lines 237–263  — date range inputs (conditional)
  Lines 265–285  — sort selector (conditional)
Lines 287–289  — closing tags
```

## empty-state.tsx Anatomy (by line range)

```
Lines   1–16   — imports + interface
Lines  18–43   — component render
  Line  20–25  — outer flex container (py-16 / py-8 compact)
  Lines 27–29  — icon circle container
  Line  30     — title text (text-sm / text-xs compact)
  Lines 31–33  — description (text-xs / text-[10px] compact)
  Lines 34–41  — action button (conditional)
```

## project-timeline.tsx Anatomy (by line range)

```
Lines   1–12   — imports
Lines  14–31   — withDate / withoutDate filtering + sorting
Lines  24–31   — minDay / totalSpan calculation
Lines  33–37   — empty tasks guard (returns centered text)
Lines  39      — todayPct calculation
Lines  41–125  — return JSX
  Line  42     — OUTER: overflow-x-auto wrapper ✓
  Line  43     — INNER: min-w-[560px] ✓
  Lines 45–61  — week label header
  Lines 63–69  — today vertical line
  Lines 72–108 — task rows with due_date
  Lines 110–122 — tasks without deadline section
```

## Key Structural Constraints

1. **task-card root div** must keep `ref={setNodeRef}` `style={style}` `{...attributes}` — DnD requirement
2. **task-filters** is stateless regarding visibility — parent controls what props it receives
3. **project-timeline inner div** `min-w-[560px]` is the content minimum — do not reduce below 560px
4. **empty-state** `compact` prop changes py-8→py-16, text-xs→text-sm — simple boolean toggle
5. **action bar** in task-card is `opacity-0 group-hover:opacity-100` — hover-only, broken on touch

## Design Token Usage

| Token | Usage | Files |
|-------|-------|-------|
| `bg-gray-900` | Card bg, input bg | task-card, task-filters, eod-panel |
| `bg-gray-800` | Secondary elements, tag bg | task-card, task-filters |
| `border-white/10` | Standard border | task-card (many), task-filters |
| `text-gray-400` | Secondary text | task-card, task-filters, empty-state |
| `text-gray-500` | Muted text | task-card, task-filters, project-timeline |
| `text-gray-600` | Very muted | task-card (action labels), task-filters |
| `brand-600` | CTA buttons | task-add-modal, task-filters (sort hover) |
| `rounded-xl` | Card radius | task-card, task-kanban |
| `rounded-full` | Pill elements | task-card pills, task-filters chips |
