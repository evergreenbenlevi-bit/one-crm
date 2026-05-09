# Errors & Issues — design-polish-phase-g
# Internal Research: Current Problems Found
# Date: 2026-05-10

## P0 Issues (Mobile Breakage)

### 1. Action Bar Inaccessible on Mobile (task-card.tsx:337)
```tsx
className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
```
- `group-hover:opacity-100` — touch devices have no hover state
- Actions (advance status, edit, delete) are INVISIBLE on mobile
- Fix: add `sm:opacity-0 opacity-100` or add touch target fallback

### 2. task-filters.tsx — No Mobile Collapse (all lines 138–288)
- 8+ filter controls always rendered in a row
- On 375px: selects overflow or stack awkwardly via flex-wrap
- Date range inputs + size pills + impact pills = too much horizontal content
- No hamburger/collapse/show-fewer mechanism
- No `sm:` breakpoints in entire file

## P1 Issues (Functional Degradation)

### 3. Typography — Redundant Inline Overrides (task-card.tsx:274–290)
```tsx
// Line 274–277
className="text-base font-semibold text-white leading-snug mb-1.5 line-clamp-2"
style={{ fontSize: '16px' }}
// text-base = 16px — identical, inline is redundant

// Line 286–290
className="text-sm text-gray-500 leading-relaxed mb-2"
style={{ fontSize: '13px' }}
// text-sm = 14px — CONFLICT. Inline wins at 13px, breaking Tailwind scale
```
- 2 instances of inline fontSize overrides
- One is conflicting (13px vs Tailwind 14px)
- Pattern: developer added inline as "override" but should use Tailwind scale consistently

### 4. Arbitrary Text Sizes — Not Design-System Tokens
- `text-[9px]` used in: project-timeline.tsx:54, task-pillars.tsx:175,224
- `text-[10px]` used in: project-timeline.tsx:103, empty-state.tsx, task-card.tsx implicitly via sub-components
- `text-[11px]` used in: task-card.tsx (7 locations), task-filters.tsx (4 locations), eod-panel.tsx, task-import-modal.tsx
- None of these are in Tailwind's default scale (smallest = text-xs = 12px)
- Creates fragmented typography with 6+ different sizes in one component

### 5. Dark/Light Mode Mismatch (tech debt — not blocking)
- task-pillars.tsx, task-add-modal.tsx, task-import-modal.tsx use `dark:` prefix
- task-card.tsx, task-filters.tsx, eod-panel.tsx use dark-first (no `dark:`)
- Result: inconsistent rendering if light mode ever activated

## P2 Issues (Polish Gap)

### 6. EmptyState — Minimal Visual Hierarchy
- Line 27: `rounded-full bg-gray-800/60 p-3` — icon container present
- No gradient, no subtle border, no animation
- `compact` mode uses `w-4 h-4` icon — very small, may feel broken
- `action` button styling (line 36–40): `bg-gray-800` on `bg-gray-900` page — barely visible
- No title font weight difference between compact/non-compact

### 7. project-timeline.tsx — Text Size Hierarchy
- Task label: `text-[11px]` (line 83)
- Priority badge: `text-[9px]` (line 84)
- Date: `text-[10px]` (line 103)
- Week label: `text-[9px]` (line 54)
- All text is very small — no hierarchy differentiation on mobile

## Non-Issues (Already Fixed)

### project-timeline.tsx overflow-x-auto
- Line 42: `overflow-x-auto -mx-1 px-1` ✓
- Line 43: `min-w-[560px]` ✓
- The P0 fix from the design gap report is ALREADY IN THE CODE
- **No action needed on project-timeline.tsx for overflow**
