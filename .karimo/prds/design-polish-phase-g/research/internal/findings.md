# Findings — design-polish-phase-g (PRIMARY)
# Internal Codebase Research — Consolidated
# Date: 2026-05-10

---

## EXECUTIVE SUMMARY

Phase G targets 5 design improvements. Research reveals:
- **P0 (project-timeline overflow): ALREADY DONE** — no code change needed
- **P1 (task-card mobile): Real gap found** — action bar hover-only breaks touch; no sm: breakpoints
- **P1 (task-filters collapse): Real gap** — 8+ controls always rendered, no mobile collapse
- **P1 (Typography scale): Real gap** — 2 conflicting inline overrides + 30+ arbitrary px sizes
- **P1 (EmptyState polish): Minor gap** — functional, visually thin

---

## FINDING 1: project-timeline.tsx — P0 ALREADY RESOLVED

**Claim from design gap report:** Add overflow-x-auto wrapper (mobile fix)

**Evidence:**
- `project-timeline.tsx:42` — outer wrapper: `overflow-x-auto -mx-1 px-1`
- `project-timeline.tsx:43` — inner content: `min-w-[560px]`

**Conclusion:** Both outer wrapper and inner min-width already exist. Fix was already applied.

**Action for plan:** SKIP — mark as done, verify in browser at 375px only.

---

## FINDING 2: task-card.tsx — Mobile Action Bar (CRITICAL)

**Location:** Line 337

**Problem:** `opacity-0 group-hover:opacity-100` — hover is inaccessible on touch. Advance status, edit, delete are permanently invisible on mobile.

**Evidence:** No `sm:`, `md:`, `lg:` breakpoints anywhere in task-card.tsx (384 lines). Pill rows have `flex-wrap` (lines 201, 297) which is fine. Action bar has zero mobile fallback.

**Fix approach:**
- `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` on action bar div
- Minimal change, correct semantics, no structural impact

---

## FINDING 3: task-filters.tsx — No Mobile Collapse

**Location:** Lines 138–288 (entire render)

**Problem:** 8+ filter control groups always rendered. No `sm:`, `md:`, `lg:` breakpoints. `flex-wrap` wraps rows but creates tall unstructured stack on 375px.

**Evidence:**
- `task-filters.tsx:139` — `flex flex-col gap-2 w-full` (no responsive variants)
- `task-filters.tsx:168` — `flex flex-wrap items-center gap-2` (no collapse)
- 4 `<select>` elements + impact pills + size pills + date range + sort selector always rendered

**Fix approach:**
- Internal `showFilters` state (boolean, default false)
- Toggle button: `sm:hidden` (desktop always shows)
- Filter controls: `hidden sm:flex` by default, toggle via state on mobile
- Active chips row stays always visible (already compact + useful)
- Active count badge on toggle button when filters applied

---

## FINDING 4: Typography — Conflicting Inline Overrides

**Location:** task-card.tsx lines 277, 290

**Problems:**
```
Line 277: style={{ fontSize: '16px' }} alongside text-base  → redundant (text-base = 16px)
Line 290: style={{ fontSize: '13px' }} alongside text-sm    → CONFLICT (text-sm = 14px, inline wins at 13px)
```

**Proposed 4-size scale:**
| Role | Size | Class |
|------|------|-------|
| Card title | 16px | `text-base` (drop inline style) |
| Body/description | 14px | `text-sm` (drop inline style) |
| Labels/metadata | 12px | `text-xs` |
| Micro/badges | 11px | `text-[11px]` (keep only where needed) |

**Fix:** Remove 2 `style={{ fontSize }}` props from task-card.tsx.
**Optional follow-up:** `text-[11px]` → `text-xs` sweep across 30+ locations (separate phase).

---

## FINDING 5: EmptyState — Visual Polish Gaps

**Location:** empty-state.tsx lines 18–43

**Problems:**
1. Icon circle `bg-gray-800/60` on `bg-gray-900` page — barely distinguishable
2. Action button `bg-gray-800` on `bg-gray-900` — low contrast
3. No ring/border on icon circle — flat appearance
4. compact mode icon `w-4 h-4` = 16px — very small

**Proposed minimal polish:**
- Icon container: add `ring-1 ring-white/10`
- Title: `text-gray-300` (was `text-gray-400`) — slightly brighter
- Action button: add `border border-white/10` + `text-gray-200` (was `text-gray-300`)
- No prop changes, no consumer updates needed

---

## IMPLEMENTATION PRIORITY (Adjusted)

| Priority | Finding | File | Lines | Risk | Effort |
|----------|---------|------|-------|------|--------|
| SKIP | project-timeline overflow | project-timeline.tsx | 42–43 | — | None |
| P1 | Action bar touch fix | task-card.tsx | 337 | Low | 5min |
| P1 | Remove inline fontSize conflicts | task-card.tsx | 277, 290 | Low | 5min |
| P1 | task-filters mobile collapse | task-filters.tsx | 138–288 | Medium | 30min |
| P2 | EmptyState ring + contrast | empty-state.tsx | 27–40 | Low | 10min |
| P3 | text-[11px] normalization sweep | tasks/* | 30+ sites | Medium | optional |

---

## CONSTRAINTS CONFIRMED

1. task-card root div keeps DnD props (ref, style, attributes) — cannot restructure outer
2. task-filters collapse uses internal state — no new props needed
3. All changes: dark monochrome only (bg-gray-900 base, no dark: additions)
4. Mobile target: 375px. Desktop target: 1440px.

---

## FILES READ

| File | Lines | Coverage |
|------|-------|----------|
| src/components/tasks/task-card.tsx | 384 | Full |
| src/components/projects/project-timeline.tsx | 127 | Full |
| src/components/tasks/empty-state.tsx | 44 | Full |
| src/components/tasks/task-filters.tsx | 290 | Full |
| src/app/(dashboard)/tasks/page.tsx | ~1400 | Partial (grep + preview) |
| src/components/tasks/task-kanban.tsx | ~270 | Partial (grep) |
| src/components/tasks/task-pillars.tsx | ~230 | Partial (grep) |
