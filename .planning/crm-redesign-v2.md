# Plan: ONE-CRM Redesign V2 — Monday.com Spec Inspired
> Created: 2026-04-13 | Model: Opus | Based on: client Monday.com spec
> Jake Principle: DB = ground truth. No manual sync. Each page = one domain.

---

## Goal
Transform ONE-CRM from a basic task/lead tracker into a precise business intelligence system — with real KPIs, Israeli tax-aware financials, retention automation, and creator intel that compares Ben's own performance against competitors.

---

## What The Monday.com Spec Teaches Us (Gap Analysis)

| Monday.com spec has | ONE-CRM current state | Action needed |
|---|---|---|
| ROAS per campaign + UTM source | No ROAS tracking | Phase A |
| CAC (cost per acquisition) | Expenses + customers exist separately | Phase A |
| LTV formula (deal + recurring) | total_paid only, no recurring model | Phase A |
| NPS + satisfaction per customer | No satisfaction tracking | Phase D |
| VAT 18% + income tax 23% formulas | Raw amounts only | Phase B |
| P&L with net-after-tax | Basic revenue/expense split | Phase B |
| Retention triggers: 30/14/7 days | No automated tracking | Phase D |
| Upsell tracking per customer | No upsell pipeline | Phase D |
| Ad performance per campaign | CampaignsTable exists, no ROAS | Phase A |
| WhatsApp automation flows | Telegram bots only | Phase D (Telegram) |
| Service calls + NPS tracking | No service call module | Phase D |
| Partner/influencer management | No partner module | Phase E (future) |
| Ben's own performance vs creators | Creator Intel tracks others only | Phase C |

---

## Phases

---

### Phase A: KPI Accuracy Dashboard
**Model:** Sonnet | **Effort:** 2 days
**Goal:** Every critical business KPI visible on main dashboard — computed from existing DB data, no new tables.

#### Step A1: KPI computation engine
- **What:** Add `/api/kpis` route that computes ROAS, CAC, LTV, retention rate from existing tables
  - ROAS = revenue_this_month / marketing_spend_this_month (expenses WHERE category='meta_ads' OR 'google_ads')
  - CAC = total_marketing_spend / new_customers_this_period
  - LTV = AVG(total_paid) + (churn_months * monthly_recurring)
  - Retention rate = active_customers / (active + churned) * 100
- **Output:** `/api/kpis?period=2026-04` → `{ roas, cac, ltv, retention_rate, churn_rate, nps_avg }`
- **Verify:** `curl http://localhost:3000/api/kpis?period=2026-04` returns valid JSON
- **Done when:** All 6 KPIs return real numbers (not null)

#### Step A2: KPI strip on main dashboard
- **What:** Add `<KpiStrip>` component to `/` dashboard — 6 cards: ROAS / CAC / LTV / Retention / Churn / Net Profit
- **Output:** `src/components/dashboard/kpi-strip.tsx`
- **Verify:** `/` shows KPI row with 6 metrics, dark monochrome, no colors
- **Done when:** ELI design review passes, mobile + desktop validated

#### Step A3: ROAS per UTM source in Campaigns page
- **What:** Add ROAS breakdown by UTM source to `/campaigns` — table: source | spend | revenue | ROAS | CAC
- **Output:** Update `src/app/(dashboard)/campaigns/` page
- **Verify:** `/campaigns` shows table with ROAS column, data matches manual calculation
- **Done when:** At least 1 real UTM source shows correct ROAS

---

### Phase B: Financial Precision (Israeli Tax Formulas)
**Model:** Sonnet | **Effort:** 1-2 days
**Goal:** Financial page shows proper VAT-aware, tax-aware P&L — matching the Monday.com spec formulas.

#### Step B1: Add tax fields to DB
- **What:** Migration — add computed/stored fields to `expenses` and a new `financial_periods` table
  ```sql
  -- financial_periods: monthly P&L snapshot
  CREATE TABLE financial_periods (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    period text NOT NULL UNIQUE,  -- '2026-04'
    gross_revenue numeric DEFAULT 0,
    vat_collected numeric GENERATED ALWAYS AS (gross_revenue * 0.18 / 1.18) STORED,
    revenue_ex_vat numeric GENERATED ALWAYS AS (gross_revenue / 1.18) STORED,
    total_expenses_ex_vat numeric DEFAULT 0,
    operating_profit numeric GENERATED ALWAYS AS (gross_revenue / 1.18 - total_expenses_ex_vat) STORED,
    income_tax_23 numeric GENERATED ALWAYS AS (GREATEST(0, gross_revenue / 1.18 - total_expenses_ex_vat) * 0.23) STORED,
    net_profit numeric GENERATED ALWAYS AS (GREATEST(0, gross_revenue / 1.18 - total_expenses_ex_vat) * 0.77) STORED,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  );
  ```
- **Output:** `supabase/migrations/20260413200000_financial_periods.sql`
- **Verify:** Supabase Management API applies migration, table visible in DB
- **Done when:** `SELECT * FROM financial_periods` works without error

#### Step B2: Financial page P&L section
- **What:** Add "חישוב מס" section to `/financial` — shows for current period:
  - הכנסות ברוטו / מע"מ לתשלום / הכנסות נטו / הוצאות / רווח לפני מס / מס הכנסה 23% / רווח נטו
- **Output:** `src/components/financial/tax-breakdown.tsx`
- **Verify:** `/financial` shows tax section with correct formulas matching Monday.com spec
- **Done when:** Manual calculation matches displayed values, ELI review passes

#### Step B3: Partner settlement with tax awareness
- **What:** Update `PartnerSettlement` to show:
  - חלק בן (נטו מע"מ) / חלק אביתר (נטו מע"מ) / התחשבנות (כמה חייב למי)
- **Output:** Update `src/components/financial/` existing settlement component
- **Done when:** Settlement shows gross + net amounts side by side

---

### Phase C: Creator Intel — Ben's Own Performance
**Model:** Sonnet | **Effort:** 1-2 days
**Goal:** Phase 7 from CREATOR-INTEL-V2-PLAN.md — Ben's YouTube + Instagram metrics alongside creators.

#### Step C1: DB table for Ben's content metrics
- **What:** Create `ben_performance_snapshots` table:
  ```sql
  CREATE TABLE ben_performance_snapshots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    platform text CHECK (platform IN ('youtube', 'instagram')),
    week text NOT NULL,
    post_url text,
    title text,
    thumbnail_url text,
    views integer,
    likes integer,
    comments integer,
    shares integer,
    reach integer,
    publish_date date,
    captured_at timestamptz DEFAULT now()
  );
  ```
- **Output:** `supabase/migrations/20260413210000_ben_performance.sql`
- **Done when:** Table exists in DB

#### Step C2: Ben's YouTube sync cron
- **What:** Add `/api/crons/ben-youtube-sync` — pulls Ben's own channel data via YouTube API
  - YouTube channel ID: to configure in `.env.local` as `BEN_YOUTUBE_CHANNEL_ID`
  - Pulls: last 10 videos, views, likes, thumbnail
- **Output:** `src/app/api/crons/ben-youtube-sync/route.ts`
- **Done when:** Manual trigger returns Ben's video data in DB

#### Step C3: "My Performance" section in creator-intel
- **What:** Add "ביצועי בן" section to `/creator-intel` below creator grid
  - Last 10 posts with metrics
  - Comparison bar: Ben avg_views vs domain average
- **Output:** `src/app/(dashboard)/creator-intel/BenPerformanceSection.tsx`
- **Done when:** Section visible, shows real data after cron run

---

### Phase D: Retention Automation
**Model:** Sonnet | **Effort:** 2 days
**Goal:** Automated retention intelligence — 30/14/7 day alerts, NPS tracking, upsell pipeline.

#### Step D1: Add retention fields to customers
- **What:** Migration — add computed retention fields:
  ```sql
  ALTER TABLE customers ADD COLUMN nps_score integer CHECK (nps_score BETWEEN -100 AND 100);
  ALTER TABLE customers ADD COLUMN satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 10);
  ALTER TABLE customers ADD COLUMN upsell_status text DEFAULT 'none'
    CHECK (upsell_status IN ('none', 'candidate', 'offered', 'accepted', 'declined'));
  ALTER TABLE customers ADD COLUMN upsell_amount numeric;
  ALTER TABLE customers ADD COLUMN days_in_program integer GENERATED ALWAYS AS
    (EXTRACT(DAY FROM NOW() - program_start_date)::integer) STORED;
  ```
- **Output:** `supabase/migrations/20260413220000_customer_retention.sql`
- **Done when:** Fields exist, days_in_program auto-calculates

#### Step D2: Retention cron — 30/14/7 alerts
- **What:** `/api/crons/retention-check` — runs daily at 08:00 UTC
  - Finds customers at day 30, 14, 7 before program end
  - Sends Telegram alert to Ben with customer name + days remaining + satisfaction score
  - Alert format (Hebrew): "⚠️ [שם] — 30 יום לסיום. ציון שביעות: X/10. פעולה: הצע upsell?"
- **Output:** `src/app/api/crons/retention-check/route.ts` + wired to `vercel.json`
- **Verify:** `vercel.json` has cron entry, manual trigger sends Telegram message
- **Done when:** Telegram bot sends alert for test customer

#### Step D3: NPS + retention dashboard widget
- **What:** Add retention widget to `/customers` — shows:
  - Active customers approaching end (30/14/7 days)
  - Average NPS score
  - Upsell pipeline status
- **Output:** `src/components/customers/retention-widget.tsx`
- **Done when:** Widget visible on /customers, data loads from DB

---

### Phase E: UX Audit — Every Dashboard Visual
**Model:** Sonnet + ELI | **Effort:** 1 day
**Goal:** Every page in ONE-CRM is visually clean, dark monochrome, proper hierarchy, mobile-validated.

#### Step E1: Dashboard audit
- **What:** Visual QA on all pages — `/`, `/leads`, `/customers`, `/financial`, `/creator-intel`, `/triage`, `/tasks`
  - Check: dark monochrome only (no blue/brand colors in data viz)
  - Check: consistent card padding (p-4 standard)
  - Check: stat cards: bold number + small label
  - Check: mobile 375px — no overflow, proper stacking
- **Tool:** gstack browser QA
- **Output:** List of visual issues per page
- **Done when:** All pages pass ELI design review

#### Step E2: Fix visual issues found
- **What:** Address all issues from Step E1
- **Done when:** Zero critical design issues, ELI re-review passes

---

## Dependencies

```
A1 → A2 (need KPI API before UI)
A1 → A3 (same KPI logic)
B1 → B2 → B3 (migration before UI)
C1 → C2 → C3 (table → sync → display)
D1 → D2 → D3 (migration → cron → UI)
E1 → E2 (audit → fix)

A, B, C, D can run in parallel (different domains)
E runs LAST (after all other phases complete)
```

---

## Build Sequence (Recommended)

| Session | Phases | Focus |
|---------|--------|-------|
| Session 3 | A1 + A2 + B1 + B2 | KPIs + Financial formulas |
| Session 4 | A3 + C1 + C2 + C3 | Campaigns ROAS + Ben's metrics |
| Session 5 | D1 + D2 + D3 | Retention automation |
| Session 6 | E1 + E2 | UX audit + polish |

---

## Risk / What Could Go Wrong

1. **ROAS requires linking ad spend → revenue** — Facebook Ads not integrated yet. ROAS Phase A will use manual expense entries (category=meta_ads) as proxy. Real API integration is Phase F (future).
   - Mitigation: Display ROAS with "(estimate — link to FB Ads for live data)" label

2. **Ben's YouTube channel ID unknown** — need to set `BEN_YOUTUBE_CHANNEL_ID` in `.env.local` before Phase C runs.
   - Mitigation: Phase C2 fails gracefully with "channel not configured" if env not set

3. **Telegram bot for retention alerts** — need to identify which bot sends it (Jarvis? dedicated CRM bot?). Per Bot Autonomy Floor: bot proposes, Ben confirms before any action.
   - Mitigation: Use Jarvis bot, send as informational alert (no action taken automatically)

4. **Tax formulas** — Israeli VAT/tax laws can change. Formulas (18% / 23%) hardcoded.
   - Mitigation: Make tax rates configurable in a `settings` table, not hardcoded

---

## Not In Scope (This Plan)

- Facebook/Google Ads API integration (real ad data) — Phase F, separate plan
- WhatsApp via Green API — use Telegram bots instead (already built)
- Skool integration — separate project
- Partner/influencer management module — Monday.com had this, ONE-CRM doesn't need it yet
- Service calls module — NPS tracking added to customers instead (simpler)
- Zoom Webinar integration — out of scope

---

## KPIs For This Plan's Success

- All 6 KPIs (ROAS/CAC/LTV/retention/churn/net profit) show real numbers
- Financial page shows VAT-corrected P&L
- Ben's own performance visible in creator-intel
- Retention cron fires and sends Telegram alert for due customers
- All pages pass ELI design review

---

## Notes (from Monday.com spec)

Key business numbers to track precisely:
- Deal size: ₪7,800 incl. VAT = ₪6,610.17 ex-VAT
- VAT: 18% (included in price, not added)
- Income tax: 23% on net profit
- LTV formula: first deal + (retention_months * monthly_recurring / 1.18)
- CAC target: < ₪2,000
- ROAS target: > 3
- Retention target: > 70%
- NPS target: > 50

---

## Status: AWAITING BEN APPROVAL
To execute: reply "מאשר" and specify which phase to start first.

---

## Full KPI Inventory (from Monday.com Spec)

### Module 1 — Leads Pipeline
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| סה"כ הכנסות חודש | Currency | SUM(deals this month) |
| עסקאות חודש | Number | COUNT(closed deals this month) |
| ממוצע ערך עסקה | Currency | הכנסות / עסקאות |
| התפלגות תשלומים | Pie Chart | installment breakdown |
| תשלומים צפויים חודש | Currency | projected installments due |
| התראות אחוריות | Alert | overdue installments |
| UTM Source | Field | per lead |
| UTM Campaign | Field | per lead |
| שיעור המרה | % | סגירות / לידים * 100 |

### Module 2 — Pipeline Follow-Up (Webinar Funnel)
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| נרשמים לוובינר | Number | COUNT(webinar registrations) |
| שיעור נוכח | % | נוכחים / נרשמים * 100 |
| מס' צפויים להצטרף | Number | projection |
| שיעור מעבר להצטרפות | % | הצטרפו / נוכחים * 100 |
| שיעור מעבר לסגירה | % | סגרו / הצטרפו * 100 |
| פאנל המרות כולל | Funnel | leads → webinar → join → close |

### Module 3 — Partnerships
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| שותפים פעילים | Number | COUNT(active partners) |
| הפניות חודש | Number | COUNT(referrals this month) |
| סה"כ עמלות תשלום | Currency | SUM(commissions) |
| ROI שותפים | % | הכנסות מהפניות / עמלות * 100 |
| שותפים TOP 5 | Table | by revenue generated |
| עמלת מוצר | Formula | {סכום עסקאות} * {אחוז עמלה} / 100 |
| נטו ממוצע אחרי עמלה | Currency | AVG(deal - commission) |

### Module 4 — Ad Campaigns
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| CTR | % | {קליקים} / {חשיפות} * 100 |
| CPC | Currency | {הוצאה בפועל} / {קליקים} |
| CPL | Currency | {הוצאה בפועל} / {לידים} |
| ROAS | Number | {שווי סגירות} / {הוצאה בפועל} |
| המרה ליד-לסגירה | % | {סגירות} / {לידים} * 100 |
| CAC | Currency | {הוצאה בפועל} / {סגירות} |
| הוצאה כוללת | Currency | SUM(ad spend) |
| לידים כולל | Number | COUNT(leads from ads) |
| CPL כולל | Currency | total spend / total leads |
| ROAS כולל | Number | total revenue / total spend |

### Module 5 — Active Customers
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| לקוחות פעילים | Number | COUNT(active) |
| התקדמות ממוצעת | % | AVG(progress_pct) |
| לקוחות בסכנה | Number + Alert | low progress or at-risk flag |
| התפלגות לפי שבוע | Column Chart | customers per program week |
| ביצועים לפי מנחה | Table | by facilitator |
| בריאות תוכנית | Gauge | overall program health |
| שבוע נוכחי במסלול | Computed | EXTRACT(WEEK FROM NOW() - start_date) |
| מספר תשלומים | Number | 1–12 installments per customer |
| תאריך תשלום הבא | Date | next installment due |
| ציון שביעות רצון | Rating 1–10 | satisfaction_rating field |
| משתתפים בפייסבוק LIVE | Number | FB live attendance count |
| השלמת קורס | % | completed_modules / total_modules * 100 |

### Module 6 — Retention & Upsale
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| לקוחות המתקרבים לסיום | Number | days_to_end <= 30 |
| שיעור retention | % | retained / total * 100 |
| הצעות upsell שנעשו | Column Chart | by month |
| סיבות נטישה | Pie Chart | churn reason categories |
| מחוון retention | Gauge | vs 70% target |
| ערך הכנסה נוספת | Currency | SUM(upsell_amount) |
| ימים לסיום | Computed | {תאריך סיום צפוי} - TODAY() |
| LTV לכל לקוח | Formula | 6610 + ({חודשי ריטיינר} * {תשלום חודשי} / 1.18) |

### Module 7 — Service Calls
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| שיחות חודש | Number | COUNT(service calls this month) |
| ציון שביעות ממוצע | Number | AVG(satisfaction_rating) |
| NPS Score | Gauge −100 to 100 | target > 50 |
| זמן תגובה ממוצע | Number (hours) | AVG(response_time_hours); target < 4h |
| נושאים עיקריים | Word Cloud | topic tags frequency |
| מגמות שביעות רצון | Line Chart | satisfaction over time |

### Module 8 — Financials (P&L)
| KPI | Type | Formula / Notes |
|-----|------|-----------------|
| הכנסות לפני מע"מ | Currency | gross_revenue / 1.18 |
| מע"מ עסקאות | Currency | gross_revenue * 0.18 / 1.18 |
| הכנסות כולל מע"מ | Currency | gross_revenue |
| הוצאות לפני מע"מ | Currency | total_expenses_ex_vat |
| מע"מ תשומות | Currency | VAT paid on inputs |
| הוצאות כולל מע"מ | Currency | expenses incl. input VAT |
| מע"מ לתשלום/להחזר | Formula | מע"מ עסקאות − מע"מ תשומות |
| רווח גולמי | Formula | הכנסות נטו − הוצאות נטו |
| הוצאות שכר ועצמאי | Currency | payroll + freelancer costs |
| רווח לפני מס | Formula | רווח גולמי − הוצאות שכר |
| מס הכנסה 23% | Formula | {רווח לפני מס} * 0.23 |
| רווח נקי אחרי מס | Formula | {רווח לפני מס} * 0.77 |
| מקדמות 30% | Formula | {מקדמות} * 0.3 |
| נטו להעברה | Formula | {מקדמות} − {מס מקדמות} |

### Key Target KPIs
| KPI | Target |
|-----|--------|
| לידים חדשים/חודש | 30 |
| סגירות/חודש | 10 |
| שיעור המרה | 33% |
| זמן סגירה ממוצע | < 7 ימים |
| Retention | > 70% |
| ריטיינר rate | > 40% |
| Churn | < 10%/חודש |
| ROAS | > 3 |
| CAC | < ₪2,000 |
| LTV | > ₪10,000 |
| רווח נקי | > 25% |
| שביעות רצון | > 8/10 |
| NPS | > 50 |
| זמן תגובה | < 4 שעות |
| השלמת קורס | > 60% |

---

## Updates to Existing Phases

### Phase A Additions (KPI Accuracy)

**A1 extended — add to `/api/kpis` output:**
- `cpl` — cost per lead (ad_spend / leads_count)
- `ctr` — click-through rate (clicks / impressions * 100)
- `cpc` — cost per click (ad_spend / clicks)
- `conversion_funnel` — `{ leads, webinar_registered, webinar_attended, sales }` (3-stage)
- `avg_deal_size` — AVG(deal amount) this period
- `monthly_revenue_installments` — SUM of installment payments due this month

**A3 extended — Campaigns page:**
- Add CTR, CPC columns alongside ROAS, CAC
- Add installment tracking table per customer: columns `customer | installment_no (1–12) | amount | due_date | status`

---

### Phase B Additions (Financial Precision)

**B1 extended — `financial_periods` table additions:**
```sql
ALTER TABLE financial_periods ADD COLUMN vat_input numeric DEFAULT 0;
ALTER TABLE financial_periods ADD COLUMN vat_net numeric
  GENERATED ALWAYS AS (vat_collected - vat_input) STORED;
ALTER TABLE financial_periods ADD COLUMN payroll_expenses numeric DEFAULT 0;
ALTER TABLE financial_periods ADD COLUMN profit_before_tax numeric
  GENERATED ALWAYS AS (operating_profit - payroll_expenses) STORED;
ALTER TABLE financial_periods ADD COLUMN income_tax numeric
  GENERATED ALWAYS AS (GREATEST(0, operating_profit - payroll_expenses) * 0.23) STORED;
ALTER TABLE financial_periods ADD COLUMN advance_tax_payments numeric DEFAULT 0;
ALTER TABLE financial_periods ADD COLUMN advance_tax_30pct numeric
  GENERATED ALWAYS AS (advance_tax_payments * 0.3) STORED;
ALTER TABLE financial_periods ADD COLUMN net_to_transfer numeric
  GENERATED ALWAYS AS (advance_tax_payments - advance_tax_payments * 0.3) STORED;
```

**B2 extended — Financial page P&L must also show:**
- מע"מ תשומות vs מע"מ עסקאות → מע"מ נטו לתשלום/להחזר
- מקדמות 30% breakdown
- נטו להעברה

---

### Phase D Additions (Retention Automation)

**D1 extended — customer fields:**
```sql
ALTER TABLE customers ADD COLUMN course_completion_pct numeric DEFAULT 0
  CHECK (course_completion_pct BETWEEN 0 AND 100);
ALTER TABLE customers ADD COLUMN webinar_attended boolean DEFAULT false;
ALTER TABLE customers ADD COLUMN installment_count integer DEFAULT 1
  CHECK (installment_count BETWEEN 1 AND 12);
ALTER TABLE customers ADD COLUMN installment_number integer DEFAULT 1;
ALTER TABLE customers ADD COLUMN next_installment_date date;
```

**D2 extended — retention cron also:**
- Flags customers where `course_completion_pct < 30` AND `days_in_program > 30` as at-risk
- Tracks webinar attendance (boolean per customer)

**D3 extended — retention widget also shows:**
- Course completion % distribution
- Webinar attendance rate (attended / total * 100)

**New: Step D4 — Service Calls Module**
- **What:** Add `service_calls` table + `/service` page
  ```sql
  CREATE TABLE service_calls (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid REFERENCES customers(id),
    call_date timestamptz DEFAULT now(),
    response_time_hours numeric,
    satisfaction_rating integer CHECK (satisfaction_rating BETWEEN 1 AND 10),
    nps_score integer CHECK (nps_score BETWEEN -100 AND 100),
    topic text,
    notes text,
    resolved boolean DEFAULT false
  );
  ```
- **Output:** `supabase/migrations/20260413230000_service_calls.sql` + `/service` page
- **KPIs shown:** avg response time, avg satisfaction, NPS gauge, monthly call count
- **Done when:** Page shows NPS gauge + response time avg + monthly trend chart

---

## KPI → DB Field Mapping

| KPI | Source | Needs New Column? | Table / Field |
|-----|--------|-------------------|---------------|
| ROAS | Computed | No | expenses + customers |
| CAC | Computed | No | expenses + customers |
| LTV | Computed | No | customers.total_paid + recurring |
| CTR | Stored | Yes | campaigns.impressions, campaigns.clicks |
| CPC | Computed | No | campaigns.spend / campaigns.clicks |
| CPL | Computed | No | campaigns.spend / leads |
| NPS Score | Stored | Yes (service_calls table) | service_calls.nps_score |
| Webinar attendance rate | Stored | Yes | customers.webinar_attended |
| Course completion % | Stored | Yes | customers.course_completion_pct |
| Installment number (1–12) | Stored | Yes | customers.installment_count, installment_number |
| Next installment date | Stored | Yes | customers.next_installment_date |
| Conversion funnel (3-stage) | Computed | Partial | needs webinar_registered count |
| Avg deal size | Computed | No | AVG(customers.deal_amount) |
| Monthly installment revenue | Computed | No | SUM(installments due this month) |
| VAT input | Stored | Yes | financial_periods.vat_input |
| VAT net (to pay/reclaim) | Computed | No | vat_collected - vat_input |
| Advance tax 30% | Stored | Yes | financial_periods.advance_tax_payments |
| Net to transfer | Computed | No | advance_tax - advance_tax * 0.3 |
| Response time per call | Stored | Yes (service_calls table) | service_calls.response_time_hours |
| Partner ROI | Computed | Partial | needs partners table (Phase E) |
| Days to program end | Computed | No | program_end_date - TODAY() |
| Facebook LIVE attendance | Stored | Yes | customers field or separate table |

### New Migrations Required (Summary)
1. `financial_periods` — vat_input, payroll_expenses, advance_tax_payments columns
2. `customers` — course_completion_pct, webinar_attended, installment_count, installment_number, next_installment_date
3. `campaigns` — impressions, clicks columns (if not already present)
4. `service_calls` — new table (Step D4)
5. `partners` — new table (Phase E, future)
