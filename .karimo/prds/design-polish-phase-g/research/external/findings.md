# Findings — External Research Consolidated
# Phase G: design-polish-phase-g
# Date: 2026-05-10

Maps each internal gap → specific Tailwind/React solution.

---

## GAP 1: task-card.tsx — Action Bar Invisible on Touch

**Internal finding:** `opacity-0 group-hover:opacity-100` on line 337. Touch devices never trigger hover — advance/edit/delete permanently hidden on mobile.

**External pattern:** Mobile-first breakpoint proxy for hover-only elements.

**Concrete fix:**
```tsx
// Before (line 337)
className="... opacity-0 group-hover:opacity-100 ..."

// After
className="... opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 ..."
```

**Why this works:** `sm:` = 640px+ only. Mobile (< 640px) gets `opacity-100` always. Desktop restores hover behavior. No JS, no new deps, DnD props untouched.

**Risk:** Low. Single className change on one div.

---

## GAP 2: task-filters.tsx — 8+ Controls Always Rendered on Mobile

**Internal finding:** Lines 138–288. `flex flex-col gap-2 w-full` with no responsive variants. 8+ control groups stack in tall unstructured column at 375px.

**External pattern:** `useState` boolean + `hidden sm:flex` + `sm:hidden` toggle.

**Concrete fix:**
```tsx
// Add to component top
const [showFilters, setShowFilters] = useState(false);
const activeCount = /* count active filter keys */;

// Add toggle button before filter controls (mobile-only)
<button
  className="sm:hidden flex items-center gap-2 text-sm text-gray-400 border border-white/10 rounded px-3 py-1.5"
  onClick={() => setShowFilters(v => !v)}
>
  <Filter className="w-3.5 h-3.5" />
  Filters
  {activeCount > 0 && (
    <span className="ml-1 text-xs bg-gray-700 text-gray-300 rounded-full px-1.5 py-0.5">
      {activeCount}
    </span>
  )}
</button>

// Wrap filter controls
<div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col gap-2`}>
  {/* existing filter control groups unchanged */}
</div>
```

**Always-visible:** Active chip rows (already compact, conveys state when collapsed).

**Risk:** Medium. Adds state + conditional class. No prop changes to parent. Existing filter logic untouched.

---

## GAP 3: task-card.tsx — Inline fontSize Conflicts

**Internal finding:** Line 277 `style={{ fontSize: '16px' }}` alongside `text-base` (redundant). Line 290 `style={{ fontSize: '13px' }}` alongside `text-sm` (conflict — inline wins at 13px, not 14px).

**External pattern:** Never use `style={{ fontSize }}` alongside Tailwind text class — inline wins specificity. Canonical Tailwind-only 4-step scale.

**Concrete fix:**
```tsx
// Line 277 — remove inline style, keep text-base
// Line 290 — remove inline style, keep text-sm (14px, correct)
```

**4-step scale enforced:**
| Role | Class | Size |
|------|-------|------|
| Card title | `text-base` | 16px |
| Body/desc | `text-sm` | 14px |
| Labels | `text-xs` | 12px |
| Micro/badge | `text-[11px]` | 11px |

**Risk:** Low. Removing 2 `style` props. Visual change: body text 13px → 14px (1px increase, intended).

---

## GAP 4: empty-state.tsx — Low Contrast on Dark Background

**Internal finding:** `bg-gray-800/60` icon circle on `bg-gray-900` = barely visible. `bg-gray-800` action button = low contrast. No ring/border on icon circle.

**External pattern:** `ring-1 ring-white/10` for dark-UI element separation. `text-gray-300` (ratio ~10:1) vs `text-gray-400` (ratio ~5.9:1, borderline).

**Concrete fix — 4 changes, no prop changes:**
```tsx
// 1. Icon container: bg-gray-800/60 → bg-gray-800 ring-1 ring-white/10
// 2. Title: text-gray-400 → text-gray-300
// 3. Action button: add border border-white/10 + text-gray-200
// 4. compact icon: w-4 h-4 → w-5 h-5 (optional P2)
```

**Risk:** Low. Visual-only, no logic, no prop changes, no consumer updates.

---

## SUMMARY — Gap → Fix Mapping

| Gap | File | Lines | Fix | Effort |
|-----|------|-------|-----|--------|
| Action bar touch | task-card.tsx | 337 | `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` | 2 min |
| Inline fontSize conflicts | task-card.tsx | 277, 290 | Remove 2 `style` props | 2 min |
| Filter collapse mobile | task-filters.tsx | 138–288 | useState + `hidden sm:flex` + toggle button | 25 min |
| EmptyState contrast | empty-state.tsx | 27–40 | ring-1 + text-gray-300 + border white/10 | 8 min |

**Total estimated effort:** ~37 min (P1 items only)

**No new npm installs required.** framer-motion installed but unused in Phase G.
