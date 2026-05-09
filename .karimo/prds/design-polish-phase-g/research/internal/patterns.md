# Patterns — design-polish-phase-g
# Internal Research: Existing Codebase Patterns
# Date: 2026-05-10

## Responsive Classes

### Current State: Almost Zero Responsive Classes in tasks/
Only ONE responsive class found in all tasks/ components:
- `task-pillars.tsx:92` — `grid grid-cols-1 md:grid-cols-3 gap-4`

Everything else in tasks/ uses **fixed layout classes with no sm:/md: breakpoints**.
No `sm:`, `lg:`, or `xl:` found in: task-card.tsx, task-filters.tsx, task-kanban.tsx, empty-state.tsx, eod-panel.tsx.

### task-kanban.tsx: Has overflow-x-auto (mobile partial fix)
- Line 245: `flex gap-5 overflow-x-auto pb-6` — kanban columns scroll horizontally

### project-timeline.tsx: Already Has Overflow Wrapper
- Line 42: `overflow-x-auto -mx-1 px-1` — outer wrapper ✓
- Line 43: `min-w-[560px]` — inner content fixed width ✓
- **P0 fix already DONE in code** — both wrapper + min-width present

## Typography Scale

### Current Sizes Used (arbitrary px — NOT Tailwind scale)
| Location | Class | Actual Size |
|----------|-------|-------------|
| task-card.tsx:274 | `text-base` + `style={{ fontSize: '16px' }}` | 16px (redundant inline) |
| task-card.tsx:286 | `text-sm` + `style={{ fontSize: '13px' }}` | 13px (redundant inline) |
| task-card.tsx:208,219,250,265 | `text-xs` | 12px |
| task-card.tsx:301,311,316,324,343,354,364 | `text-[11px]` | 11px (arbitrary) |
| task-filters.tsx:56,269,280 | `text-sm` | 14px |
| task-filters.tsx:146,160,204,225 | `text-[11px]` | 11px (arbitrary) |
| project-timeline.tsx:54 | `text-[9px]` | 9px (arbitrary) |
| project-timeline.tsx:83 | `text-[11px]` | 11px (arbitrary) |
| project-timeline.tsx:103 | `text-[10px]` | 10px (arbitrary) |
| empty-state.tsx:30 | `text-sm` / `text-xs` | 14px / 12px |
| empty-state.tsx:32 | `text-[10px]` / `text-xs` | 10px / 12px |

### Inline Style Overrides (anti-pattern)
- task-card.tsx:277 `style={{ fontSize: '16px' }}` — overrides `text-base` (same value, redundant)
- task-card.tsx:290 `style={{ fontSize: '13px' }}` — overrides `text-sm` (Tailwind text-sm = 14px, inline = 13px, conflict)

### Dominant Arbitrary Sizes
`text-[9px]`, `text-[10px]`, `text-[11px]` — used in 30+ locations across all task components. No Tailwind scale token at these sizes.

## Color Tokens

### Base Tokens (dark monochrome — consistent)
- Background: `bg-gray-900` (primary card), `bg-gray-800` (secondary elements)
- Borders: `border-white/[0.07]`, `border-white/10`, `border-white/15`
- Text: `text-gray-200` (primary), `text-gray-400` (secondary), `text-gray-500`/`text-gray-600` (muted)

### Semantic Colors (consistent)
- Priority P0: `bg-red-600 text-white`
- Priority P1: `bg-orange-500 text-white`
- Priority P2: `bg-blue-600/80 text-blue-100`
- Priority P3: `bg-gray-700 text-gray-400`
- Overdue: `text-red-400`, `bg-red-900/40`
- Brand: `bg-brand-600` (CTA buttons)

### Mixed Dark/Light Artifacts (tech debt)
- task-pillars.tsx uses `dark:` prefix — mixing dark-mode toggle pattern with dark-first approach
- task-add-modal.tsx uses `dark:bg-gray-700` — same mismatch
- task-import-modal.tsx uses `dark:border-gray-700` — same mismatch
- task-card.tsx: pure dark, no `dark:` prefixes — CORRECT pattern

## Spacing Patterns

### Card Padding
- task-card.tsx:198 `pl-6 pr-3 pt-3 pb-3` — internal content padding
- task-card.tsx:198 — left-6 accounts for drag handle (6px = handle width)

### Gap Patterns
- Row 1 (pills): `gap-1.5` (task-card.tsx:201)
- Row 4 (owner/tags): `gap-1.5` (task-card.tsx:297)
- Action bar: `gap-1` (task-card.tsx:337)
- Filters row: `gap-2` (task-filters.tsx:168)
- Chips row: `gap-1.5` (task-filters.tsx:142)

## Flex/Layout

### task-filters.tsx — No Collapse/Mobile Behavior
- Line 139: `flex flex-col gap-2 w-full` — outer container
- Line 168: `flex flex-wrap items-center gap-2` — filter controls
- `flex-wrap` present → chips flow to next line, but ALL controls always visible
- No collapse/show-more mechanism, no sm: breakpoints
- On 375px: all selects + pills + date inputs stack via flex-wrap — potential overflow

### task-card.tsx — No Responsive Classes
- Line 201: `flex items-center gap-1.5 mb-2.5 flex-wrap` — pills row (has flex-wrap ✓)
- Line 297: `flex items-center gap-1.5 flex-wrap` — owner/tags row (has flex-wrap ✓)
- Line 337: `flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100` — action bar
  - `opacity-0 group-hover:opacity-100` — MOBILE PROBLEM: hover is inaccessible on touch
