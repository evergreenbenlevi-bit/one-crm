# Status Migration Audit
> Phase 0 — READ ONLY (do NOT migrate yet)
> Generated: 2026-04-18
> Purpose: Map all hardcoded status references before any migration

---

## Current Status Enum (DB)
`backlog, todo, in_progress, waiting_ben, done, inbox, up_next, scheduled, waiting, someday, archived`

## Target Status Enum (Phase 1 migration)
`inbox, todo, in_progress, waiting, done, archived`

## Mapping Plan (PENDING APPROVAL)
| Old | New | Note |
|-----|-----|------|
| backlog | inbox | merge into inbox |
| todo | todo | keep |
| in_progress | in_progress | keep |
| waiting_ben | waiting | rename |
| done | done | keep |
| inbox | inbox | keep |
| up_next | todo | merge into todo |
| scheduled | todo | merge (no equivalent) |
| waiting | waiting | keep |
| someday | inbox | merge into inbox (backlog behavior) |
| archived | archived | keep |

---

## Hardcoded References by File

### API Routes

**src/app/api/tasks/route.ts**
- L100: `.neq("status", "backlog").neq("status", "done")` — exclude_backlog filter
- L253: `newVal === "done"` — completion detection

**src/app/api/actions/route.ts**
- L40: `status: "inbox"` — default for new tasks from actions

**src/app/api/dump/route.ts**
- L105: `status: "todo"` — default for dumped tasks
- L168: `status: "backlog"` — default for backlog dump

**src/app/api/tasks/[id]/complete/route.ts**
- L82: `status: "todo"` — recurring task spawn status

**src/app/api/tasks/bulk/route.ts**
- L31: `status: "backlog"` — fallback for invalid status on bulk import

**src/app/api/tasks/schedule/route.ts**
- L51: `status: "scheduled"` — schedule action sets this status

**src/app/api/triage/calendar-create/route.ts**
- L132: `status: "scheduled"` — calendar-create sets scheduled

**src/app/api/triage/process-batch/route.ts**
- L47, L52: `status: "todo"` — triage accept → todo
- L61: `status: "inbox"` — triage defer → inbox
- L65: `status: "archived"` — triage kill → archived

### Pages

**src/app/(dashboard)/tasks/page.tsx**
- L61: `status: "todo"` — new task default
- L280: `t.status === "done" || t.status === "backlog"` — filter exclusion
- L283: `t.status === "in_progress" || t.status === "waiting_ben" || (t.status === "todo" && ...)` — focus logic
- L294: `t.status !== "done" && t.status !== "backlog"` — queue filter
- L316: `t.status === "in_progress"` — WIP count
- L323: `t.status === "in_progress"` — stats

**src/app/(dashboard)/triage/page.tsx**
- L1176: `t.status !== "done" && t.status !== "archived" && t.status !== "someday"` — open tasks filter
- L1253: `status: "done"` — mark done
- L356: `task.status === "in_progress"` — display condition

**src/app/(dashboard)/projects/page.tsx**
- L56, L64-65, L79, L127, L184-185: `done`, `in_progress`, `waiting_ben` — project health/display

**src/app/(dashboard)/projects/[id]/page.tsx**
- L55, L229: `done` — completion display

### Components

**src/components/tasks/task-kanban.tsx**
- L55: `status === "backlog"` — column styling
- L56: `status === "in_progress"` — WIP indicator
- L208: `status === "in_progress"` — WIP count display

**src/components/tasks/task-pillars.tsx**
- L57-58, L65, L137: `in_progress` — active task detection

**src/components/calendar/calendar-inner.tsx**
- L42: `t.status !== "done"` — calendar display filter

**src/components/dashboard/team-dashboard.tsx**
- L41-44, L70-71, L91-92: `done`, `in_progress`, `todo`, `waiting_ben` — team stats

### Library

**src/lib/tasks-store.ts**
- L89, L160: `status === "done"` — completion timestamp logic

**src/lib/queries/dashboard.ts**
- L152: `.eq("status", "scheduled")` — dashboard scheduled query

**src/lib/task-utils.ts**
- L24: `done`, `in_progress` — status icons in text output

---

## Risk Assessment

### HIGH RISK (blocking changes)
- `waiting_ben` → `waiting`: Used in 4+ files including components. Requires coordinated update.
- `backlog` → `inbox`: Used as default fallback in bulk import + filter queries. Could silently break.
- `scheduled` removal: Used in `tasks/schedule` API and `triage/calendar-create` — need replacement logic.
- `up_next` removal: In VALID_STATUSES and DB but not heavily referenced — lower risk.

### MEDIUM RISK
- `someday` → `inbox`: Only in triage filter (L1176) — easy to update.

### LOW RISK
- `done`, `todo`, `in_progress`, `archived`, `inbox`: All keeping same name — no changes needed.

---

## DO NOT MIGRATE UNTIL
- [ ] All API routes updated for new statuses
- [ ] All UI components updated  
- [ ] `VALID_STATUSES` in route.ts updated
- [ ] `TaskStatus` type updated
- [ ] `statusLabels`, `statusColors`, `statusAccent` updated
- [ ] DB enum altered (ALTER TYPE task_status)
- [ ] Existing rows migrated (UPDATE tasks SET status = 'waiting' WHERE status = 'waiting_ben')
