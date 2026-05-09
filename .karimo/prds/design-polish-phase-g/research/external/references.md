# References — Tailwind Docs + Dark UI Patterns
# Phase G External Research
# Date: 2026-05-10

---

## Tailwind CSS — Key Docs Patterns

### Responsive Design
https://tailwindcss.com/docs/responsive-design

- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px), `2xl` (1536px)
- All unprefixed utilities apply to every screen size
- Prefixed utilities apply at that breakpoint and above
- **Mobile-first pattern:** `[mobile-default] sm:[desktop-override]`

### Hover, Focus, Active States
https://tailwindcss.com/docs/hover-focus-and-other-states

- `hover:` applies only when mouse is present — unreliable on touch
- `group` + `group-hover:` for parent-triggered child states
- `group` must be added to ancestor, `group-hover:` to descendant
- v4 supports arbitrary group names: `group/[name]` for nested groups

### Visibility / Display Utilities
https://tailwindcss.com/docs/display

- `hidden` = `display: none` (element removed from flow)
- `flex` / `block` / `inline-flex` = show
- Pattern: `hidden sm:flex` = hidden on mobile, flex on desktop
- Pattern: conditional show via React: `${show ? 'flex' : 'hidden'} sm:flex`

### Opacity + Transitions
https://tailwindcss.com/docs/opacity
https://tailwindcss.com/docs/transition-property

- `opacity-0` / `opacity-100` = 0%/100%
- `transition-opacity` = transition only opacity prop
- `duration-150` = 150ms (snappy, good for hover reveals)
- Full pattern: `opacity-0 group-hover:opacity-100 transition-opacity duration-150`

### Ring Utilities (border-ring)
https://tailwindcss.com/docs/ring-width

- `ring-1` = 1px ring (uses box-shadow, not border — no layout impact)
- `ring-white/10` = white ring at 10% opacity — subtle edge on dark
- Ideal for dark-UI elements that need separation without color

---

## Dark UI — Empty State Best Practices

### Pattern: Layered Hierarchy
Dark empty states need 3 distinguishable layers:
1. **Icon container** — ring or border separates from background
2. **Primary text** — `text-gray-300` minimum on `bg-gray-900`
3. **CTA button** — border + slightly brighter text than surrounding content

### Anti-patterns on dark
- `bg-gray-800` on `bg-gray-900` with no ring → invisible boundary
- `text-gray-400` as primary message → borderline WCAG AA (4.5:1 fails at small sizes)
- Icon at 16px (w-4 h-4) in compact empty state → too small, reads as noise

### Recommended empty-state structure (dark monochrome)
```tsx
<div className="flex flex-col items-center gap-3 py-12 text-center">
  <div className="w-12 h-12 rounded-full bg-gray-800 ring-1 ring-white/10 flex items-center justify-center">
    <Icon className="w-5 h-5 text-gray-500" />
  </div>
  <p className="text-sm font-medium text-gray-300">{title}</p>
  <p className="text-xs text-gray-500 max-w-[200px]">{description}</p>
  {action && (
    <button className="text-xs text-gray-200 border border-white/10 rounded px-3 py-1.5">
      {action.label}
    </button>
  )}
</div>
```

---

## WCAG 2.1 — Contrast Ratios (Dark)

| Foreground | Background | Ratio | AA Pass (normal text) |
|-----------|-----------|-------|----------------------|
| gray-300 (#D1D5DB) | gray-900 (#111827) | ~10:1 | Yes |
| gray-400 (#9CA3AF) | gray-900 (#111827) | ~5.9:1 | Yes (borderline small) |
| gray-500 (#6B7280) | gray-900 (#111827) | ~3.8:1 | No (use for metadata only) |

Source: WCAG 2.1 SC 1.4.3 — minimum 4.5:1 for normal text, 3:1 for large text.

---

## React State — Filter Collapse Reference

Standard pattern from React docs + Tailwind UI:
```tsx
// Single local state, no prop changes needed
const [open, setOpen] = useState(false);

// Toggle visible only on mobile
<button className="sm:hidden" onClick={() => setOpen(v => !v)}>
  {open ? 'Hide' : 'Filters'} {count > 0 && `(${count})`}
</button>

// Content responsive show/hide
<div className={cn(open ? 'flex' : 'hidden', 'sm:flex flex-col gap-2')}>
  {/* filter controls */}
</div>
```
