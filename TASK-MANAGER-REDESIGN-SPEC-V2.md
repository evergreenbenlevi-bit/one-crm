# Task Manager Redesign — Spec V2
> Status: READY TO BUILD — no Chen needed for Phase 0-2
> Created: 2026-04-18
> Supersedes: TASK-MANAGER-REDESIGN-SPEC.md (V1)
> Owner: Ben + Claude
> Portfolio: ONE

---

## 1. Vision

A task + project management system that:
- Enforces discipline (no task without deadline + time estimate)
- Prioritizes automatically (algorithm), overridable by drag
- Knows WHEN to surface each task (time_slot: morning/afternoon/evening)
- Tracks actual vs estimated time (learns over time)
- Feeds EOD daily review flow
- Syncs to Google Calendar

One codebase, one DB (Supabase), one app. No external tools.

---

## 2. Current State (verified by codebase audit 2026-04-18)

### Tasks Table — 29 columns (key ones)
- `id, title, description, priority, status, owner, category`
- `due_date` — nullable (needs to become required)
- `estimated_minutes` — nullable, CHECK(5,15,30,45,60,90,120)
- `impact` — nullable, CHECK(needle_mover, important, nice)
- `size` — nullable, CHECK(quick, medium, big)
- `effort` — nullable, semi-deprecated (overlaps size)
- `layer` — nullable, DEPRECATED (drop it)
- `position` — integer, global (not scoped per view)
- `is_recurring, recur_pattern, recur_next_at` — exists, broken
- `triage_action, triage_notes, triaged_at` — exists, no UI
- `workstream, sprint_week` — exists, low usage

### What's Broken / Disconnected
- `TaskKanban` component — built with DnD, **never rendered in any live page** (dead import)
- `POST /api/tasks/schedule` — no UI caller
- `PATCH /api/tasks/[id]/complete` — no UI caller (recurring spawn logic never fires)
- `GET/POST/DELETE /api/tasks/[id]/reminders` — no UI caller
- `POST /api/tasks/[id]/archive` — no UI caller
- DnD position reorder — no within-column persistence (only cross-column status change)
- `p0` priority — in DB enum but rejected by API validator
- No `projects` table — projects = parent tasks (broken model)

### Status Enum (current): `backlog, todo, in_progress, waiting_ben, done`
> Note: actual live enum is 5 values (not 11 as previously thought — some statuses were UI-only labels)

---

## 3. Decisions Made

| Decision | Value |
|----------|-------|
| Architecture | Stay one app, one DB |
| Projects | First-class table (`projects`) — not parent tasks |
| Statuses | Simplify to 6: inbox, todo, in_progress, waiting, done, archived |
| Priority | Hybrid: algorithm default, Ben overrides by drag |
| Deadline | Mandatory in UI (API stays permissive for Claude) |
| Estimated minutes | Mandatory in UI, auto-populated from size preset |
| Time tracking | `actual_minutes` via EOD input (not timer — friction too high) |
| DnD | Connect existing TaskKanban + fix position persistence |
| Chen | Phase 3+ only — visual polish after logic works |

---

## 4. New Fields to Add

### On `tasks` table
```sql
ALTER TABLE tasks ADD COLUMN time_slot TEXT CHECK (time_slot IN ('morning','afternoon','evening','any')) DEFAULT 'any';
ALTER TABLE tasks ADD COLUMN actual_minutes INTEGER;
ALTER TABLE tasks ADD COLUMN priority_score NUMERIC(6,2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN manually_positioned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
```

### Drop / deprecate
```sql
ALTER TABLE tasks DROP COLUMN layer;
-- effort: keep for now, map to size in migration, drop in Phase 6
```

---

## 5. New `projects` Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','paused','done','archived')),
  priority TEXT DEFAULT 'p2' CHECK (priority IN ('p1','p2','p3')),
  category TEXT,
  portfolio TEXT CHECK (portfolio IN ('one','solo','harness','exploratory')),
  owner TEXT DEFAULT 'ben' CHECK (owner IN ('ben','claude','both','avitar')),
  position INT DEFAULT 0,
  deadline DATE,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);
```

---

## 6. Priority Score Algorithm

```
priority_score =
  deadline_urgency  (40%) — days_until_deadline normalized 0-10, inverted
  impact_score      (35%) — needle_mover=3, important=2, nice=1, null=1
  size_bonus        (25%) — quick=1.2x boost, big=0.9x
```

**Authority rules:**
- `manually_positioned = false` → algorithm controls order
- User drags → sets `manually_positioned = true` → drag position locked
- `manually_positioned` auto-resets to false when: deadline changes OR task moves to different status column
- Overdue (past deadline + not done) → `priority_score` gets +1000 override → floats to top regardless

**Compute trigger:** DB function on UPDATE of `due_date, impact, size`. Also: daily cron at 06:00 recalculates all scores (deadline_urgency changes daily).

---

## 7. Time Slot System

### Field values
- `morning` — 07:00–12:00: deep work, needle-movers, creative
- `afternoon` — 12:00–17:00: medium tasks, calls, reviews
- `evening` — 20:00–22:00: quick wins, admin, inbox, errands
- `any` — no preference

### Auto-assign rules (priority order — first match wins)
1. If `impact = needle_mover` → `morning`
2. If `size = quick` AND deadline > today → `evening`
3. If `size = big` → `morning`
4. Default → `any`

### Conflict resolution
- quick + needle_mover → `morning` wins (rule 1 takes priority)
- Overdue task → always show in current slot regardless of time_slot value

### Daily view behavior
- Morning (07:00–12:00): show morning + any tasks
- Afternoon (12:00–17:00): show afternoon + any tasks
- Evening (20:00–22:00): show evening + any tasks
- Outside slots: show all

### Focus tab redesign
- Focus tab becomes slot-aware (not a separate concept)
- Morning = BIG3 + morning tasks (max 3 visible, keyboard nav)
- Evening = quick wins + inbox triage
- Replaces old "max 3 hardcoded" logic

---

## 8. Mandatory Fields

### UI enforcement
- `deadline` — required. Date picker inline. Cannot save without it.
- `estimated_minutes` — required. Populated from size preset, overridable.

### Size presets (auto-fill estimated_minutes)
- quick → 15 min
- medium → 60 min
- big → 180 min
- Custom → manual number

### API stays permissive
- Claude creates tasks via API without deadline → allowed
- Add `created_by: 'claude'` field to distinguish
- Mandatory validation = UI-only

### Existing data migration
- All tasks without deadline → set `deadline = NULL` (keep as-is, not forced)
- UI shows "overdue / no deadline" badge on tasks missing deadline
- Ben triages manually via triage view

---

## 9. EOD Flow

### Endpoint: `GET /api/eod/summary`
Returns:
```json
{
  "open_tasks": [...],        // status != done, due_date <= today
  "overdue_tasks": [...],     // due_date < today, not done
  "completed_today": [...],   // completed_at = today
  "time_logged": 0,           // sum of actual_minutes logged today
  "fitness_stub": {           // empty fields for Mike routing
    "steps": null,
    "workout": null,
    "nutrition": null,
    "energy_score": null
  }
}
```

### Flow (Claude Code, not Telegram)
1. Ben opens session after 20:00
2. Claude fetches `/api/eod/summary`
3. Presents open tasks + asks Ben to log actual_minutes on completed ones
4. Ben inputs fitness data (steps, workout, nutrition) → Claude routes to Mike
5. Tasks marked done/carry/park/kill
6. Session closes clean

---

## 10. Calendar Sync

### Scope
- One-directional: tasks → Google Calendar (not reverse)
- Triggered on: task save with deadline + time_slot set
- Creates calendar block based on time_slot:
  - morning → 09:00 for estimated_minutes duration
  - afternoon → 14:00
  - evening → 20:00
  - any → no calendar block created

### Collision handling
- If slot is full (overlapping blocks): create block at next available time in slot window
- If no space: create at start of slot with "(conflict)" suffix in title

### Auth
- Service role key for server-side sync
- Refresh token stored in `.secrets`
- Failure → log to `calendar_sync_errors` table, silent (no crash)

---

## 11. Overdue Handling

- Task past deadline + not done → red badge on card
- `priority_score` += 1000 (auto-floats to top)
- `manually_positioned` reset to false (algorithm takes over)
- Activity log entry: "Task became overdue"
- No automatic status change (Ben decides)

---

## 12. Weekly Capacity View

Shows per-day breakdown:
```
Monday:
  Morning  (07-12): 120 min committed / 180 min available
  Afternoon (12-17): 60 min / 240 min available
  Evening  (20-22): 90 min / 120 min available
  [WARNING: Evening overloaded]
```

- Computed from: tasks with that day's deadline + time_slot + estimated_minutes
- Shown in /tasks header or side panel
- Prevents overbooking before it happens

---

## 13. Information Architecture

```
/tasks
  Tab: Focus    — slot-aware, BIG3 + current slot tasks
  Tab: Board    — Kanban with DnD (TaskKanban, finally connected)
  Tab: List     — sortable table, inline editing
  Tab: Backlog  — grouped by category

/projects
  Tab: Active   — project cards with progress + deadline
  Tab: Done     — archive

/projects/[id]
  Tab: Board    — Kanban for this project's tasks
  Tab: List     — task table with subtask expansion
  Tab: Timeline — phase 2
```

---

## 14. Build Phases

### Phase 0 — Data Foundation (no UI, safe to run now)
- [ ] Drop `layer` column
- [ ] Add new columns: `time_slot, actual_minutes, priority_score, manually_positioned, project_id`
- [ ] Create `projects` table
- [ ] Fix `p0` priority in API validator
- [ ] Priority score compute DB function + trigger
- [ ] Daily score recompute cron (06:00)
- [ ] Status migration audit (find all hardcoded status references)

### Phase 1 — API Layer
- [ ] `POST/GET/PATCH/DELETE /api/projects` — full CRUD
- [ ] `GET /api/eod/summary` — EOD aggregation endpoint
- [ ] Position update with composite scope `(project_id, status, position)`
- [ ] Size preset auto-fill logic
- [ ] Calendar sync service (Google Calendar OAuth + block creation)

### Phase 2 — UI Foundation (connect existing, not rewrite) ✅ 2026-04-18
- [x] Connect `TaskKanban` to `/tasks` Board tab
- [x] Wire DnD position persistence (calls position update API on drag-end)
- [x] Add tab navigation: Focus / Board / List / Backlog via ?tab= URL param
- [ ] Inline editing in List view (click-to-edit title, status, deadline) — deferred to Phase 3
- [x] Mandatory field validation in task-add-modal + task-edit-modal (deadline + estimated_minutes)
- [x] Overdue badge on task cards ("פג תוקף" red chip)

### Phase 3 — New Features
- [ ] time_slot field + auto-assign + UI selector
- [ ] Focus tab redesign (slot-aware)
- [ ] Daily view filtered by current time slot
- [ ] actual_minutes input in EOD flow
- [ ] Priority score display on cards (small badge)
- [ ] manually_positioned flag + drag behavior
- [ ] Overdue auto-escalation (priority_score + 1000)
- [ ] Weekly capacity view

### Phase 4 — Projects UI
- [ ] `/projects` page with project cards
- [ ] `/projects/[id]` Board + List tabs
- [ ] Subtask DnD reorder within project

### Phase 5 — Integrations
- [ ] Google Calendar sync live
- [ ] EOD Mike fitness routing
- [ ] Deadline notification via Telegram (Jarvis bot)

### Phase 6 — Polish (Chen phase)
- [ ] Visual design system update
- [ ] Animations + DnD transitions
- [ ] Mobile DnD
- [ ] Task templates
- [ ] Filters across all views
- [ ] Empty states

---

## 15. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Status migration breaks queries | HIGH | Audit all `WHERE status =` before migrating |
| Mandatory deadline breaks Claude API task creation | HIGH | API stays permissive, UI enforces only |
| priority_score vs drag authority conflict | HIGH | `manually_positioned` flag + clear reset rules |
| Position collisions (Claude API + Ben drag) | MEDIUM | Composite index + sequential position update |
| Calendar OAuth token expiry | MEDIUM | Refresh token + failure logging |
| `time_slot` rule conflicts (quick + needle_mover) | MEDIUM | Priority order documented in section 7 |
| All existing tasks lack deadline | MEDIUM | Migration backfill plan + triage view |

---

## 16. Files Map

| File | Action |
|------|--------|
| `supabase/migrations/` | New migration: add columns + projects table |
| `src/app/api/projects/route.ts` | CREATE (doesn't exist) |
| `src/app/api/eod/summary/route.ts` | CREATE |
| `src/app/api/tasks/route.ts` | Fix p0, add time_slot/actual_minutes/project_id |
| `src/components/tasks/task-kanban.tsx` | CONNECT to live page |
| `src/app/(dashboard)/tasks/page.tsx` | Add tabs, render TaskKanban in Board tab |
| `src/app/(dashboard)/projects/page.tsx` | Rewrite using projects table |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Rewrite with DnD board |
| `src/components/tasks/task-add-modal.tsx` | Add mandatory field validation + size presets |
| `src/components/tasks/task-edit-modal.tsx` | Add time_slot, actual_minutes fields |
| `src/lib/priority-score.ts` | CREATE: score compute logic |
| `src/lib/calendar-sync.ts` | CREATE: Google Calendar integration |

---

## Reference Systems
Linear (keyboard-first board), Notion (flexible views), Things 3 (focus view), Todoist (natural language input)
