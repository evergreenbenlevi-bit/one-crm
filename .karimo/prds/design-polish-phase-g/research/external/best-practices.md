# Best Practices — Tailwind Mobile-First Responsive + Touch/Hover
# Phase G External Research
# Date: 2026-05-10

---

## 1. Mobile-First Responsive in Tailwind

**Core principle:** Tailwind breakpoints apply upward (`sm:` = ≥640px, `md:` = ≥768px).
Default (no prefix) = mobile. Override at `sm:` for desktop.

```
# Wrong (desktop-first)
opacity-100 hover:opacity-100 sm:opacity-0 sm:hover:opacity-100

# Correct (mobile-first)
opacity-100 sm:opacity-0 sm:group-hover:opacity-100
```

**Applied to task-card action bar:**
- Mobile (default): `opacity-100` — always visible, touch accessible
- Desktop (sm+): `sm:opacity-0 sm:group-hover:opacity-100` — hover reveal

---

## 2. Touch vs Hover Disclosure Pattern

**Problem:** CSS `hover:` does not fire reliably on touch devices. iOS/Android treat tap as a single pointer event — hover state never persists.

**Solutions by constraint level:**

### A. CSS-only (Tailwind, no JS) — best for P1 items
Use `@media (hover: none)` to show hidden elements on touch devices:
```css
/* In globals.css or component */
@media (hover: none) {
  .action-bar { opacity: 1 !important; }
}
```
Tailwind equivalent: no native `hover-none:` variant in Tailwind v3/v4 without config.
**Workaround:** mobile-first `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` achieves same result via breakpoint proxy.

### B. React state on touch events (medium effort)
`onTouchStart` → set `isActionVisible = true`. Works but requires prop threading.
Not recommended for P1 (adds complexity to DnD-constrained task-card).

### C. framer-motion (installed: ^12.38.0, but NOT needed for P1)
`whileHover`, `whileTap` props. Overkill for simple opacity reveal. Reserve for P3 polish.

**Recommended for this sprint:** Option A (breakpoint proxy). Single class change, zero JS.

---

## 3. group-hover Pattern — Correct Usage

`group` must be on the parent. `group-hover:` applies to children.

```tsx
// Parent
<div className="group relative">
  // Child — hidden on desktop, visible on mobile
  <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
    {/* action buttons */}
  </div>
</div>
```

**Tailwind v4 note:** `group-hover:` syntax unchanged. `transition-opacity duration-150` recommended for smooth desktop reveal.

---

## 4. Mobile Filter Collapse Pattern

Standard pattern: boolean state + `hidden sm:flex` + toggle button `sm:hidden`.

```tsx
const [showFilters, setShowFilters] = useState(false);

// Toggle (mobile only)
<button
  className="sm:hidden flex items-center gap-2 text-sm text-gray-400"
  onClick={() => setShowFilters(v => !v)}
>
  Filters {activeCount > 0 && <span className="badge">{activeCount}</span>}
</button>

// Filter controls
<div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col gap-2`}>
  {/* all controls */}
</div>
```

**Key decisions:**
- Active chips row stays always visible — conveys current state even when collapsed
- Badge on toggle button shows active filter count (usability signal)
- `sm:hidden` on toggle = desktop never sees it
- `hidden sm:flex` on controls = desktop always shows, mobile toggled

---

## 5. Typography Scale — 4-Step Convention

Tailwind's named scale maps to a clean 4-step hierarchy:

| Role       | Tailwind class | Size   |
|------------|---------------|--------|
| Card title | `text-base`   | 16px   |
| Body/desc  | `text-sm`     | 14px   |
| Labels     | `text-xs`     | 12px   |
| Micro/badge| `text-[11px]` | 11px   |

**Rule:** Never use `style={{ fontSize }}` alongside a Tailwind text class — inline styles win in specificity and create invisible conflicts.

**Fix:** Remove `style={{ fontSize: 'Xpx' }}` props; rely on Tailwind class alone.

---

## 6. Dark UI Contrast — Minimum Viable Differentiation

On `bg-gray-900` (#111827):
- `bg-gray-800` = barely distinguishable (ΔL ≈ 3%)
- `ring-1 ring-white/10` = adds perceptible edge without color
- `bg-gray-800/60` on `bg-gray-900` = nearly invisible — avoid for icon containers

**Pattern for icon containers on dark backgrounds:**
```tsx
<div className="w-12 h-12 rounded-full bg-gray-800 ring-1 ring-white/10 flex items-center justify-center">
  <Icon className="w-6 h-6 text-gray-500" />
</div>
```

**Text contrast on dark:**
- `text-gray-400` = readable but thin (WCAG AA borderline)
- `text-gray-300` = reliably readable, use for primary empty-state messaging
- `text-gray-500` = metadata, secondary
