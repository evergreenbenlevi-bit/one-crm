# Research Summary — design-polish-phase-g
> Date: 2026-05-10 | Phase G: Design Polish Sprint

## Executive Summary

P0 (timeline mobile overflow) is already in prod code — skip.
4 real gaps remain. Total fix effort: ~37 min, zero new installs.
All fixes use Tailwind classes + React.useState only (framer-motion installed but not needed).

---

## Gap → Fix Map

| Gap | File | Fix | Effort |
|-----|------|-----|--------|
| Action bar unreachable on touch | task-card.tsx:337 | `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` | 2 min |
| Filter bar always expanded on mobile | task-filters.tsx:138–288 | useState + `hidden sm:flex` collapse | 25 min |
| Inline fontSize overrides typography | task-card.tsx:277,290 | Remove 2 `style` props | 2 min |
| Empty state icon low contrast | empty-state.tsx:27–40 | `ring-1 ring-white/10`, `text-gray-300`, `border border-white/10` | 8 min |

**Skipped (P0 already done):** project-timeline.tsx overflow fix — `overflow-x-auto -mx-1 px-1` + `min-w-[560px]` already in code at lines 42–43.

---

## Files Affected

- `src/components/tasks/task-card.tsx` (lines 277, 290, 337)
- `src/components/tasks/task-filters.tsx` (lines 138–288, new state)
- `src/components/tasks/empty-state.tsx` (lines 27–40)

---

## Out of Scope (Phase G)

- Dark/light mismatch (task-pillars.tsx, modals using `dark:` prefix) — tech debt, future phase
- Design token system (CSS custom properties) — P2, larger effort
- Button/Badge unification — P2
- Micro-interactions — P2

---

## Next Step

```
/karimo:plan --prd design-polish-phase-g
```
