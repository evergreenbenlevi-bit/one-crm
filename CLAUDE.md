# Workspace: ONE-CRM
# ~/ONE-CRM/ — production CRM application

## Context
Read APP-SPEC.md before any ONE-CRM work. Update it after significant changes.

## ONE-CRM Specifics
- Production: https://one-crm-nine.vercel.app
- Local: http://localhost:3000
- DB: Supabase Frankfurt ref yrurlhjpzkztfwntgpzn. Creds in ~/.claude/.secrets.

## Rules
**Session Sync Protocol** — for every CRM work session:
1. Start: `bash ~/.claude/scripts/crm-task-update.sh start "task title"`
2. Heartbeat every 5 min: `bash ~/.claude/scripts/crm-task-update.sh heartbeat $CLAUDE_SESSION_ID`
3. Done: `bash ~/.claude/scripts/crm-task-update.sh done "task title"`
4. New tasks: always set `impact` (needle_mover/important/nice) + `size` (quick/medium/big)

**Bulk CRM Action Gate** — any bulk action >3 items: show list first, wait for explicit "כן" before executing.

**CRM Design** — validate mobile (375px) AND desktop (1440px) before shipping. Dark monochrome only.

**DB Writes** — default: upsert (ON CONFLICT DO UPDATE), never blind INSERT on tables that may contain existing records.

**Status Values**: inbox, up_next, scheduled, in_progress, waiting, done, someday, archived

## Task → Skill Routing

| Task | Skill |
|------|-------|
| New feature implementation | `feature-dev:feature-dev` |
| Fix UI bug / visual QA | `design-review` |
| Pre-ship PR review | `review` |
| Ship to production | `ship` |
| Run QA + fix bugs found | `qa` |
| Frontend component build | `frontend-design` |
| Design a new page | `plan-eng-review` → `frontend-design` |
| Debug unexpected behavior | `diagnose` |
| Export data / reports | `xlsx` or `pdf` |
| Session closure | `session-closure` |

## Skip in this workspace
- Bot/Telegram skills — not relevant here
- Research skills — use only for competitive/product research
