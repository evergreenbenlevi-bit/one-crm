# ONE-CRM — App Specification

> Version: 1.0 | Last updated: 2026-04-01
> Stack: Next.js 14 App Router · Supabase (Frankfurt) · Vercel · Tailwind CSS · TypeScript

---

## Pages

| URL | File | Purpose | Key Components |
|-----|------|---------|----------------|
| `/` | `(dashboard)/page.tsx` | Main dashboard — overview, BIG3, stats | `Big3Today`, `StatCard` |
| `/leads` | `(dashboard)/leads/` | Lead pipeline — kanban + table views | `LeadsKanban`, `LeadsTable`, `LeadDetail`, `LeadEditModal` |
| `/triage` | `(dashboard)/triage/page.tsx` | Task triage — card-by-card decision UI (mobile+desktop). Quick actions: Claude/Ben/Done/Delete/Skip. Inline date picker for Ben tasks. Expand to edit all fields. Filters: untriaged/overdue/owner/category. | `TriageCard`, `StatsStrip`, filters, `AnimatePresence` |
| `/tasks` | `(dashboard)/tasks/` | Task management — kanban board | `TaskKanban`, `TaskEditModal`, `TaskAddModal` |
| `/customers` | `(dashboard)/customers/` | Customer profiles, payments, program tracking | `CustomerTabs`, `CustomerEditModal`, `Timeline` |
| `/meetings` | `(dashboard)/meetings/` | Meeting scheduler + history | meetings components |
| `/projects` | `(dashboard)/projects/` | Project tracking (team view) | project components |
| `/content` | `(dashboard)/content/` | Content calendar + ideas | content components |
| `/campaigns` | `(dashboard)/campaigns/` | Meta/Google ad campaigns | `CampaignsTable` |
| `/goals` | `(dashboard)/goals/` | Revenue + customer goals tracking | goals components |
| `/research` | `(dashboard)/research/` | AI research tool | research components |
| `/applications` | `(dashboard)/applications/` | Program applications queue | application components |
| `/calendar` | `(dashboard)/calendar/` | Calendar view | calendar components |
| `/financial` | `(dashboard)/financial/` | Revenue, transactions, expenses | financial components |
| `/news` | `(dashboard)/news/` | AI-curated news feed | news components |
| `/settings` | `(dashboard)/settings/` | App settings | settings components |
| `/dump` | `(dashboard)/dump/page.tsx` | Brain Dump — free-text thought dump, Claude classifies to task/idea/reminder/note, routes to CRM or Vault | textarea, results list, history |
| `/more` | `(dashboard)/more/` | Mobile overflow nav (links to hidden pages) | nav list |
| `/login` | `app/login/` | Auth page | login form |

---

## Data Models

### Task
```ts
id: string
title: string
description: string | null
priority: "p1" | "p2" | "p3"
status: "backlog" | "todo" | "in_progress" | "waiting_ben" | "done"
owner: "claude" | "ben" | "both" | "avitar"
category: "one_tm" | "self" | "brand" | "temp" | "research" | "infrastructure" | "personal"
layer: "needle_mover" | "project" | "quick_win" | "wishlist" | "nice_to_have" | "deleted" | null
due_date: string | null  // YYYY-MM-DD
tags: string[]
depends_on: string | null  // task id
parent_id: string | null   // task id (subtask)
source: string | null
is_recurring: boolean
recur_pattern: "daily" | "weekly:N" | "monthly:N" | null
recur_next_at: string | null
position: number
created_at: string
updated_at: string
```

### Lead
```ts
id: string
name: string
email: string | null
phone: string | null
occupation: string | null
source: "campaign" | "organic" | "youtube" | "referral" | "instagram" | "linkedin" | "content" | "webinar" | "skool" | "other"
program: "one_core" | "one_vip"
interest_program: "one_core" | "one_vip" | null
instagram_handle: string | null
how_found_us: string | null
pain_points: string | null
current_status: "new" | "consumed_content" | "engaged" | "applied" | "qualified" | "onboarding" | "active_client" | "completed" | "lost"
lead_score: number | null
score_level: string | null
campaign_id: string | null
ad_id: string | null
created_at: string
updated_at: string
```

### Customer
```ts
id: string
lead_id: string | null
name: string
email: string | null
phone: string | null
program: "one_core" | "one_vip" | null
products_purchased: ProgramType[]
mentor: string | null
skool_username: string | null
total_paid: number
payment_status: "completed" | "pending" | "failed" | "refunded"
program_start_date: string | null
program_end_date: string | null
current_month: number
status: "active" | "completed" | "churned"
created_at: string
updated_at: string
```

---

## API Routes

### Tasks
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/tasks` | List tasks — filters: status, priority, owner, category, parent_id, exclude_backlog |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks` | Update task by id (id in body) |
| DELETE | `/api/tasks?id=` | Delete task |
| POST | `/api/tasks/bulk` | Bulk create/update tasks |
| POST | `/api/tasks/[id]/complete` | Mark task done (handles recurring re-schedule) |
| GET/POST | `/api/tasks/[id]/reminders` | Manage task reminders |

### Triage
| Method | Route | Purpose |
|--------|-------|---------|
| PATCH | `/api/triage` | Batch update task layers — body: `{ updates: [{id, layer}] }` |
| POST | `/api/triage/parse` | AI brain dump → layer assignments — body: `{ text, tasks }` |

### Leads
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/leads` | List leads — filters: program, status, source, search, limit, offset |
| POST | `/api/leads` | Create lead |
| GET/PATCH/DELETE | `/api/leads/[id]` | Get / update / delete single lead |
| PATCH | `/api/leads/[id]/status` | Update lead status only |
| POST | `/api/leads/[id]/score` | Run AI lead scoring |
| POST | `/api/leads/[id]/convert` | Convert lead → customer |

### Customers
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| GET/PATCH/DELETE | `/api/customers/[id]` | Get / update / delete customer |

### Other
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/meetings` | List meetings |
| POST | `/api/meetings` | Create meeting |
| GET/PATCH/DELETE | `/api/meetings/[id]` | Single meeting CRUD |
| GET/POST | `/api/notes` | Customer/lead notes |
| PATCH/DELETE | `/api/notes/[id]` | Note CRUD |
| GET/POST | `/api/proposals` | Proposals |
| GET/POST | `/api/goals` | Business goals |
| GET | `/api/news` | AI news feed |
| GET | `/api/research` | AI research |
| POST | `/api/chat` | AI chat (Claude) — streamed via ai-sdk |
| POST | `/api/crm-query` | Natural language CRM query |
| GET | `/api/content-ideas` | AI content ideas |
| GET/POST | `/api/content-metrics` | Content performance metrics |
| GET | `/api/search` | Global search across entities |
| GET/POST | `/api/applications` | Program applications |
| POST | `/api/big3/week` | BIG3 weekly task management |
| POST | `/api/big3/tasks/[id]/complete` | Complete a BIG3 task |

### Webhooks
| Route | Source | Purpose |
|-------|--------|---------|
| `/api/webhook/cardcom` | CardCom | Payment success → create/update customer |
| `/api/webhook/upay` | UPay | Alternative payment processor |
| `/api/webhook/fillout` | Fillout.com | Form submission → create lead |
| `/api/webhook/grow` | Grow | Lead gen integration |

---

## Components

### Layout
- `components/layout/sidebar.tsx` — Desktop left sidebar with nav links, role-filtered
- `components/layout/mobile-nav.tsx` — Fixed bottom nav bar (mobile only, `lg:hidden`), `h-16`, z-50
- `components/layout/global-search.tsx` — Search modal (cmd+k)

### Tasks
- `components/tasks/task-edit-modal.tsx` — Full task edit modal (all fields). Used in /tasks AND /triage
- `components/tasks/task-add-modal.tsx` — Quick-create task modal
- `components/tasks/task-card.tsx` — Kanban card view
- `components/tasks/task-kanban.tsx` — Drag-and-drop kanban board
- `components/tasks/task-filters.tsx` — Filter bar (status, priority, owner, category)
- `components/tasks/task-pillars.tsx` — Pillar grouping view
- `components/tasks/tag-input.tsx` — Tag multi-select input
- `components/tasks/big3-today.tsx` — BIG3 task widget for dashboard

### Leads
- `components/leads/lead-detail.tsx` — Lead profile panel / detail view
- `components/leads/lead-edit-modal.tsx` — Edit lead fields
- `components/leads/lead-add-modal.tsx` — Create new lead
- `components/leads/leads-table.tsx` — Table view of leads
- `components/leads/leads-kanban.tsx` — Kanban pipeline view
- `components/leads/lead-filters.tsx` — Lead filter bar

### Customers
- `components/customers/customer-card-header.tsx` — Customer profile header
- `components/customers/customer-tabs.tsx` — Tab navigation (overview, payments, meetings, notes)
- `components/customers/customer-edit-modal.tsx` — Edit customer
- `components/customers/customer-add-modal.tsx` — Create customer
- `components/customers/timeline.tsx` — Activity timeline

### AI
- `components/ai-chat.tsx` — Floating AI chat button + chat window
- `components/ai-chat-client.tsx` — Client wrapper (dynamic import, SSR=false)

### UI
- `components/ui/stat-card.tsx` — KPI stat card
- `components/ui/status-badge.tsx` — Color-coded status badge
- `components/ui/tabs.tsx` — Reusable tab component
- `components/ui/theme-toggle.tsx` — Dark/light mode toggle
- `components/theme-provider.tsx` — next-themes provider

---

## Layer System

Triage layers classify tasks by strategic priority:

| Layer | ID | Meaning |
|-------|----|---------|
| 🚀 Needle Mover | `needle_mover` | Directly moves the business forward — do first |
| 📁 Project | `project` | Multi-step initiative with clear deliverable |
| ⚡ Quick Win | `quick_win` | High value, low effort — done in < 30 min |
| 🛍️ Wishlist | `wishlist` | Nice future features, no urgency |
| ✨ Nice to Have | `nice_to_have` | Low priority, revisit someday |
| 🗑️ Delete | `deleted` | Obsolete, remove from system |

---

## Mobile Nav

**Items (admin role):** Dashboard / Leads / Triage / Meetings / More
**Items (team role):** Dashboard / Projects / Tasks
Fixed bottom bar, `h-16`, `z-50`, `lg:hidden` — hides on desktop (sidebar takes over).
`pb-20 lg:pb-0` applied to main content to clear the nav bar.

---

## AI Chat Button

Floating button (`ai-chat.tsx` via `ai-chat-client.tsx`):
- **Mobile:** `bottom-[80px] right-4`, 18px icon, `z-60` (above mobile nav z-50)
- **Desktop:** `bottom-6 left-6`, 22px icon
- Chat window appears above button, connects to `/api/chat` (Claude via ai-sdk)

---

## Integrations

| Service | Purpose | Access |
|---------|---------|--------|
| **Supabase** | Database (Frankfurt, `yrurlhjpzkztfwntgpzn`) | `createAdminClient()` for API routes, `createClient()` for server components |
| **Vercel** | Deployment, Edge runtime for some routes | `npx vercel --prod` |
| **Anthropic** | AI chat (`/api/chat`), lead scoring, brain dump parse | `ANTHROPIC_API_KEY` |
| **CardCom** | Israeli payment processor | Webhook `/api/webhook/cardcom` |
| **UPay** | Alt payment processor | Webhook `/api/webhook/upay` |
| **Fillout** | Form builder for lead intake | Webhook `/api/webhook/fillout` |
| **Grow** | Lead gen platform | Webhook `/api/webhook/grow` |

---

## Auth & RBAC

- Auth via Supabase Auth (`requireAuth()` in every API route)
- Roles: `admin` (Ben) | `team` (staff) — affects nav items, page access
- Local dev mode: `NEXT_PUBLIC_SUPABASE_URL` unset → skips auth, defaults to `admin`

---

## Key Conventions

- **SWR** for client-side data fetching (`useSWR` + `fetcher` from `@/lib/fetcher`)
- **`isLocalMode`** flag in API routes to use in-memory store when Supabase not configured
- **`preferredRegion`** set to EU on latency-sensitive routes (`fra1`, `arn1`, `cdg1`)
- **RTL** layout for Hebrew UI (`dir="rtl"` on inputs, right-aligned text)
- **Dark mode** via Tailwind `dark:` classes + next-themes
- All task mutations go through `/api/tasks` PATCH (id in body), not `/api/tasks/[id]`
