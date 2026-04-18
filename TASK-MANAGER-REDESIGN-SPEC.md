# Task Manager Redesign — Project Spec (DRAFT)
> Status: **WAITING FOR CHEN** — needs UI/UX consultation before execution
> Created: 2026-04-16
> Owner: Ben + Chen (UI/UX)
> Portfolio: ONE
> Estimated size: L (multi-session build)

---

## 1. Vision

Build a high-quality, standalone task & project management system within the CRM.
Must feel like a real product — drag-and-drop everywhere, visual hierarchy, tabs, statuses, tags, connections.
Claude has full API access to create/update/prioritize tasks programmatically.

**Core principle**: manual prioritization (drag to reorder), NOT algorithmic scoring.

---

## 2. Current State Analysis

### What Exists (Tasks)
- 5 view modes: Focus (max 3), Pillars, Backlog, Completed, Archived
- 11 statuses: `inbox`, `up_next`, `scheduled`, `in_progress`, `waiting`, `waiting_ben`, `done`, `someday`, `archived`, `backlog`, `todo`
- Priorities: P1/P2/P3 with visual accent
- Categories: `one_tm`, `self`, `brand`, `temp`, `research`, `infrastructure`, `personal`, `errands`
- Subtasks via `parent_id` (one level deep)
- Bulk actions (multi-select + floating bar)
- Tags, recurring tasks, activity timeline
- BIG3 weekly sprint tracker
- Cmd+K quick add, keyboard navigation
- Owner filter: Claude / Ben / All

### What Exists (Projects)
- Projects = tasks with children (no dedicated entity)
- Grid cards showing progress bar (done/total subtasks)
- Project detail page with board view (status columns) + list view
- "Add subtask" from within project

### What Exists (DnD)
- `@dnd-kit/core` + `@dnd-kit/sortable` installed
- `TaskKanban` component fully built with DnD
- BUT: not connected to any live page
- `position` column exists in DB but never persisted on drag

### Tech Stack
- Next.js 16.1.6 (App Router), React 19
- Supabase (PostgreSQL), SWR v2
- Tailwind CSS v4, Framer Motion v12
- RTL Hebrew UI, dark mode supported
- No shadcn/ui — custom component system

---

## 3. Known Gaps & Problems

### Architecture
| # | Gap | Impact |
|---|-----|--------|
| A1 | Projects not a first-class entity — no `projects` table | No project-level metadata (deadline, milestones, budget, owner, status independent of tasks) |
| A2 | Position drag-and-drop not persisted to DB | Reorder is visual-only, resets on refresh |
| A3 | TaskKanban component built but disconnected | Wasted work, inconsistent experience |
| A4 | 11 statuses — too many, confusing | Users rarely use `someday`, `waiting`, `scheduled` distinctly |
| A5 | Category list hardcoded differently per view | Pillars shows only `brand`+`one_tm`, Backlog shows 5/9 categories |

### UX
| # | Gap | Impact |
|---|-----|--------|
| U1 | No drag-and-drop in any active view | Can't manually reorder/prioritize by dragging |
| U2 | All views are flat lists — no board/Kanban accessible | No visual workflow view |
| U3 | No inline editing — must open modal for most changes | Slow workflow |
| U4 | No project timeline / Gantt / milestone view | Can't see project progress over time |
| U5 | No task dependencies visualization | `depends_on` field exists but invisible in UI |
| U6 | Subtasks only one level deep | Can't represent complex project hierarchies |
| U7 | No filters on Pillars/Completed/Archived views | Inconsistent filtering across views |
| U8 | No due date picker in list views (only in Kanban hover) | Important field buried |

### Data Model
| # | Gap | Impact |
|---|-----|--------|
| D1 | `layer` column deprecated but still in schema | Dead weight |
| D2 | `effort` semi-deprecated, overlaps with `size` + `estimated_minutes` | Confusing fields |
| D3 | No project-level fields (deadline, budget, milestones, team) | Projects can't be managed as projects |
| D4 | `task_status` DB enum may not match TypeScript types | 5 original vs 11 current — migration gap |

---

## 4. Proposed System Design (High-Level Draft)

### 4.1 Information Architecture

```
/tasks                  — Task Manager (all tasks, multiple views)
  Tab: Board            — Kanban with drag-and-drop (status columns)
  Tab: List             — Sortable table with inline editing
  Tab: Focus            — Today's priorities (existing, enhanced)
  Tab: Backlog          — Backlog grouped by category

/projects               — Project Hub (dedicated project management)
  Tab: Active           — Project cards with progress
  Tab: Completed        — Done projects archive
  
/projects/[id]          — Project Detail
  Tab: Board            — Kanban for this project's tasks
  Tab: List             — Task table with subtask expansion
  Tab: Timeline         — Milestones + task timeline (phase 2)
  Tab: Notes            — Project-level notes/docs
```

### 4.2 Drag-and-Drop Everywhere

| Where | What You Drag | What Happens |
|-------|---------------|--------------|
| Board view columns | Task card | Changes status (column) |
| Within any column | Task card up/down | Changes priority position (persisted) |
| List view rows | Row handle | Reorder within current sort (persisted) |
| Project cards | Project card | Reorder projects by priority (persisted) |
| Subtask list | Subtask row | Reorder subtasks within parent (persisted) |

### 4.3 New `projects` Table (Proposed)

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',     -- active, paused, done, archived
  priority TEXT DEFAULT 'p2',       -- p1, p2, p3
  category TEXT,                    -- same categories as tasks
  owner TEXT DEFAULT 'ben',         -- ben, claude, both, avitar
  position INT DEFAULT 0,          -- manual ordering
  deadline DATE,                    -- project-level deadline
  tags TEXT[],                      -- project tags
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- Tasks get: project_id UUID REFERENCES projects(id) ON DELETE SET NULL
-- Replaces parent_id for project membership (parent_id stays for subtasks)
```

### 4.4 Status Simplification (Proposed)

Current 11 statuses -> proposed 6:

| New Status | Maps From | Meaning |
|------------|-----------|---------|
| `inbox` | inbox | Unprocessed |
| `todo` | todo, up_next, backlog | Ready to work |
| `in_progress` | in_progress, scheduled | Actively working |
| `waiting` | waiting, waiting_ben | Blocked/waiting |
| `done` | done | Completed |
| `archived` | archived, someday | Out of sight |

### 4.5 Claude API Access

Claude reads/writes tasks via existing API routes:
- `GET /api/tasks` — query with filters
- `POST /api/tasks` — create task/subtask
- `PATCH /api/tasks` — update status/priority/position
- `GET /api/projects` + `POST /api/projects` — new project CRUD
- Position updates via `PATCH /api/tasks { position: N }`

No changes needed for Claude access — existing API covers it.

---

## 5. Open Questions for Chen

### UI/UX Design Decisions
1. **Board vs List as default view** — which should be the landing view for /tasks?
2. **Card design** — how much info on each card? (title only? + priority + due date? + tags?)
3. **Drag handle style** — grip dots? Full card draggable? Handle on left?
4. **Mobile drag-and-drop** — long-press? Swipe actions instead?
5. **Color coding** — by priority? by category? by status? Minimal or rich?
6. **Project detail layout** — sidebar + main? Full-width tabs? Split view?
7. **Subtask expansion** — inline accordion? Side panel? Nested cards?
8. **Empty states** — what do empty boards/lists look like?
9. **Quick actions** — hover buttons? Right-click menu? Swipe?
10. **Status column visibility** — show empty columns? Collapse them?

### Architecture Decisions
11. **Status simplification** — agree on 6 statuses? Or keep more?
12. **Separate projects table** — yes/no? Impact on existing data migration
13. **Subtask depth** — one level? Two levels? Unlimited?
14. **Dependencies** — show in UI? Or leave for later phase?
15. **Timeline/Gantt** — phase 1 or phase 2?

### Design System
16. **Follow existing CRM design language** or evolve it?
17. **Animation budget** — smooth DnD transitions? Card flip? Minimal?
18. **Responsive breakpoints** — same as CRM or task-specific?

---

## 6. Phased Build Plan (Draft)

### Phase 1 — Foundation (Sonnet execution)
- [ ] Create `projects` table + migration
- [ ] Add `project_id` to tasks table
- [ ] Migrate existing parent-tasks to projects table
- [ ] Wire DnD position persistence (the `position` field already exists)
- [ ] Connect existing `TaskKanban` component to /tasks Board view
- [ ] Add position update API endpoint

### Phase 2 — Views & Navigation
- [ ] Redesign /tasks with tab navigation (Board, List, Focus, Backlog)
- [ ] Build new /projects page with project cards
- [ ] Build /projects/[id] detail page
- [ ] Inline editing for list view
- [ ] Subtask drag-and-drop reorder

### Phase 3 — Polish & Advanced
- [ ] Status simplification + migration
- [ ] Project-level notes/description panel
- [ ] Filters across all views
- [ ] Empty states
- [ ] Mobile-optimized DnD
- [ ] Timeline view (if approved)

### Phase 4 — Integration
- [ ] Claude API documentation for new endpoints
- [ ] Task templates
- [ ] Recurring project support
- [ ] Bulk project operations

---

## 7. Reference Systems (Inspiration)

- **Linear** — keyboard-first, clean board, minimal cards
- **Notion** — flexible views (table/board/calendar/timeline), inline editing
- **Todoist** — drag reorder, sections, natural language input
- **ClickUp** — everything views, custom fields, multiple assignees
- **Things 3** — elegant focus view, clean drag, project grouping

---

## 8. Current Files Map

| File | Purpose | Needs Changes |
|------|---------|---------------|
| `src/app/(dashboard)/tasks/page.tsx` | Main tasks page | Major refactor — add tabs, connect Kanban |
| `src/app/(dashboard)/projects/page.tsx` | Projects list | Rewrite — use projects table |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Project detail | Rewrite — DnD board + tabs |
| `src/components/tasks/task-kanban.tsx` | DnD Kanban (built, unused) | Connect + fix position persistence |
| `src/components/tasks/task-card.tsx` | Sortable task card | Enhance — inline editing |
| `src/app/api/tasks/route.ts` | Tasks CRUD API | Add position update, project_id filter |
| `src/app/api/projects/` | Does not exist | Create — full CRUD |
| DB: `tasks` table | Main data | Add `project_id`, clean deprecated columns |
| DB: `projects` table | Does not exist | Create with migration |

---

## Next Steps

1. **Share this doc with Chen** — get UI/UX input on open questions (section 5)
2. **Chen designs key screens** — Board view, Project detail, Card design
3. **Finalize status list** — agree on simplification
4. **Create execution plan** — detailed task breakdown per phase
5. **Execute in Sonnet sessions** — phase by phase with QA gates
