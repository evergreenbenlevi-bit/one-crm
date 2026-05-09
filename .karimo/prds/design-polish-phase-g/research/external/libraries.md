# Libraries — design-polish-phase-g
# Date: 2026-05-10

---

## Decision: No New Libraries

All Phase G fixes use only existing project dependencies.

---

## Available (confirmed via package.json)

| Library | Version | Usage in Phase G |
|---------|---------|-----------------|
| tailwindcss | ^4 | Primary — all class-based fixes |
| React | 19.2.3 | useState for filter collapse toggle |
| framer-motion | ^12.38.0 | INSTALLED but NOT used in Phase G |
| lucide-react | ^0.577.0 | Existing icons in empty-state (no change) |

---

## framer-motion — Installed, Not Used

Status: **installed** (`package.json` confirms `"framer-motion": "^12.38.0"`).

Why not used in Phase G:
- P1 items require minimal-risk changes
- Opacity reveal + filter collapse are achievable with Tailwind classes + React state
- Adding motion deps to DnD-constrained task-card increases risk
- framer-motion reserved for future P3 animation polish (e.g. card entrance, filter panel slide)

---

## What Phase G Uses

1. **Tailwind CSS classes** — `opacity-100`, `sm:opacity-0`, `sm:group-hover:opacity-100`, `hidden sm:flex`, `ring-1 ring-white/10`, `transition-opacity`, breakpoint variants
2. **React.useState** — single boolean for filter collapse toggle in task-filters.tsx
3. **CSS transitions** — `transition-opacity duration-150` (Tailwind utility, no extra dep)

---

## Not Considered / Not Needed

| Library | Reason skipped |
|---------|---------------|
| @radix-ui/react-collapsible | Overkill for single-file filter toggle |
| headlessui | Not installed, not needed |
| react-spring | Not installed |
| CSS Modules | Not used in project — Tailwind only |
