# Workspace: ONE-CRM
# ~/ONE-CRM/ — production CRM application

## Context
Read APP-SPEC.md before any ONE-CRM work. Update it after significant changes.

## ONE-CRM Specifics
- Production: https://one-crm-nine.vercel.app
- Local: http://localhost:3000
- DB: Supabase Frankfurt ref yrurlhjpzkztfwntgpzn. Creds in ~/.claude/.secrets.

## KARIMO GATE — MANDATORY
**Every new feature in this workspace goes through KARIMO. No exceptions.**

```
Step 1: /karimo:research "feature name"   ← ALWAYS start here
Step 2: /karimo:plan --prd {slug}
Step 3: /karimo:run --prd {slug}
Step 4: /karimo:merge --prd {slug}
```

SKIP only for: bug fix, copy change, config tweak, single-file edit, anything under 45min.
When in doubt → KARIMO.

---

## Rules
**Session Sync Protocol** — for every CRM work session:
1. Start: `bash ~/.claude/scripts/crm-task-update.sh start "task title"`
2. Heartbeat every 5 min: `bash ~/.claude/scripts/crm-task-update.sh heartbeat $CLAUDE_SESSION_ID`
3. Done: `bash ~/.claude/scripts/crm-task-update.sh done "task title"`
4. New tasks: always set `impact` (needle_mover/important/nice) + `size` (quick/medium/big)

**Bulk CRM Action Gate** — any bulk action >3 items: show list first, wait for explicit "כן" before executing.

**CRM Design** — validate mobile (375px) AND desktop (1440px) before shipping. Dark monochrome only.

**UI Pre-Build Gate (Claude Design)** — לפני build של feature UI חדש: mockup ב-Claude Design (`claude.ai/design`, repo מחובר) → אישור בן → Export "Hand off to Claude Code" → bundle prompt ל-session הזה → build עם קומפוננטות קיימות. Exception: bug fix / copy tweak / micro-UI. ELI design-review חובה לפני ship.

**DB Writes** — default: upsert (ON CONFLICT DO UPDATE), never blind INSERT on tables that may contain existing records.

**Status Values**: inbox, up_next, scheduled, in_progress, waiting, done, someday, archived

## Task → Skill Routing

| Task | Skill |
|------|-------|
| New feature implementation | `/karimo:research` → KARIMO flow |
| Fix UI bug / visual QA | `design-review` |
| Pre-ship PR review | `review` |
| Ship to production | `ship` |
| Run QA + fix bugs found | `qa` |
| Frontend component build | `frontend-design` |
| Design a new page / UI mockup | `claude-design-route` → handoff → `frontend-design` |
| Design a new page (code-first fallback) | `plan-eng-review` → `frontend-design` |
| Debug unexpected behavior | `diagnose` |
| Export data / reports | `xlsx` or `pdf` |
| Session closure | `session-closure` |

## Skip in this workspace
- Bot/Telegram skills — not relevant here
- Research skills — use only for competitive/product research

## North Star
**Done when:** CRM manages all leads + tasks + expenses in production
**Key metric:** Daily active use by Ben
**NOT success:** Features built but not used

## Checkpoint Protocol
Before claiming "done":
1. Verify output file exists (grep/ls — not "it ran without errors")
2. State where it lives + what connects to it
3. What's still missing
4. Update PLAN.md / handoff file
- Before claiming done — verify route exists, data persists, UI updates live

## Anti-patterns
- Building features not in PLAN.md without Ben approval
- Skipping stage-qa before claiming a component is done
- Direct DB writes without validating schema first
- Frontend changes without testing mobile view

## SSOT Files
| File | Purpose |
|------|---------|
| `ACTION-PLAN-FULL.md` | Current execution plan — source of truth |
| `APP-SPEC.md` | Product specification |
| vault:08_TASKS/PROJECTS/ONE-CRM-MASTER.md | Project master plan |
| `TASK-MANAGER-REDESIGN-SPEC.md` | Task manager redesign spec (active) |

## Jake Structure
> Added: 2026-04-25
- `_input/`      → raw data in (paste, files, links)
- `_reference/`  → project-context.md + source docs (never delete)
- `_process/`    → fix-files as failures emerge (NN-fix-[what].md pattern)
- `_output/`     → session results ([YYYY-MM-DD]-[task].md)

**Session Protocol:**
- START: read `_reference/project-context.md`
- END: write `_output/[date]-summary.md` with what changed
- FAILURE: add `_process/NN-fix-[what].md` before next run

---

## Feature Context Gate (2026-05-05)
**Rule:** כל feature חדש שיוצר subfolder (תחת `src/` וכד׳) → חייב `CONTEXT.md` בתוך הfolder לפני כל קוד.
**Format:** purpose, URLs, credentials, env vars, files map.
**Skip:** bug fix, single-file edit, config tweak.

<!-- KARIMO:START - Do not edit between markers -->
## KARIMO

This project uses [KARIMO](https://github.com/opensesh/KARIMO) for PRD-driven autonomous development.

### Quick Reference

- **Commands:** Type `/karimo:` to see all commands
- **Agent rules:** `.claude/plugins/karimo/KARIMO_RULES.md`
- **Configuration:** `.karimo/config.yaml`
- **Learnings:** `.karimo/learnings/`

### GitHub Configuration

| Setting | Value |
|---------|-------|
| Owner Type | _pending_ |
| Owner | _pending_ |
| Repository | _pending_ |

_Run `/karimo:configure` to detect and populate these values._
<!-- KARIMO:END -->

Last audit: /Users/benlevi/ONE-CRM/_input/next-sprint.md (2026-05-03)
