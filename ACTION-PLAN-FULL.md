# ACTION-PLAN: CRM מלא ל-ONE™ — תכנית ביצוע

> מבוסס על תשתית נועם (CRM-CC) + מה שכבר נבנה + התאמות ONE™
> עודכן: 2026-03-18

---

## מצב נוכחי — מה כבר קיים

### תשתית נועם (הבסיס שאי אפשר לוותר עליו):
- **14 טבלאות DB** — leads, customers, transactions, campaigns, goals, meetings, expenses, applications, content_metrics, funnel_events, notes, files, automations_log, tasks
- **12 דפים עם UI** — דשבורד, לידים (Kanban+Table), לקוחות, פיננסי, בקשות, קמפיינים, תוכן, פגישות, יעדים, הגדרות, משימות, עוד
- **API routes מלא** — CRUD לכל ישות + lead scoring + webhooks (Fillout, Cardcom, UPay)
- **Components** — 30+ קומפוננטות React מלאות
- **RLS + Auth** — Row Level Security על כל הטבלאות
- **Dark mode, RTL, Mobile nav** — responsive מלא

### מה Claude הוסיף (סשן קודם):
- **Tasks module** — עובד ב-local mode (JSON file), Kanban + dnd-kit
- **68 משימות מיובאות** מ-KANBAN.md + DASHBOARD.md
- **Middleware bypass** ל-local mode
- **Type fixes** (product→program) — build עובר

### מה לא עובד עדיין:
- **11 מתוך 12 דפים** דורשים Supabase — בלי DB הם נופלים
- **seed.sql** — משתמש בשמות ישנים של נועם (`freedom`, `simply_grow`, `closed`) שלא תואמים את ה-enums ב-migration
- **אין domain** — הכל רק על localhost
- **אין deploy** — לא ב-Vercel

---

## תכנית ביצוע — 7 שלבים

### שלב 1: Supabase Setup ⏱️ 15 דק
> **מי:** בן (2 דק) + Claude (13 דק)

**בן עושה:**
1. נכנס ל-[supabase.com](https://supabase.com) → New Project
2. שם: `one-crm` | Region: `eu-central-1` (Frankfurt) | Password: חזק
3. מעביר 3 מפתחות לClaude:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/public)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role)

**Claude עושה:**
1. מעדכן `.env.local` עם המפתחות
2. מריץ migration (`001_initial_schema.sql` + `20260318_tasks.sql`) דרך Supabase SQL Editor או CLI
3. מוודא שכל 14 הטבלאות + enums נוצרו

---

### שלב 2: Seed Data — התאמה ל-ONE™ ⏱️ 30 דק
> **מי:** Claude לבד

**הבעיה:** ה-seed.sql של נועם משתמש בשמות ישנים:
| seed (נועם) | migration (ONE™) |
|------------|-----------------|
| `freedom` / `simply_grow` | `one_core` / `one_vip` |
| `closed` / `sales_call` / `watched_vsl` | `active_client` / `applied` / `consumed_content` |
| `product` (column name) | `program` (column name) |

**Claude עושה:**
1. יוצר `seed-one.sql` — seed חדש מותאם ל-ONE™:
   - 20 לידים עם שמות עבריים ריאליסטיים
   - 8 לקוחות (ONE™ Core + ONE™ VIP)
   - 17 טרנזקציות (תשלומים Cardcom/UPay)
   - 32 funnel events (מתואמים ל-lead_status enum)
   - 5 קמפיינים (Meta Ads ל-ONE™)
   - 6 פגישות
   - 2 יעדים (Q1 2026)
   - 10 הערות
   - 5 הוצאות
2. מריץ את ה-seed על Supabase
3. מוודא שכל הנתונים נטענו

---

### שלב 3: אימות UI מלא ⏱️ 20 דק
> **מי:** Claude לבד

בודק כל דף שהוא פונקציונלי:

| # | דף | מה לבדוק |
|---|-----|----------|
| 1 | **דשבורד** | KPIs (הכנסות, לידים, CAC, ROI), גרף מגמות, Hot leads, פגישות קרובות |
| 2 | **לידים** | Kanban view, Table view, פילטרים, drag status change, lead detail |
| 3 | **לקוחות** | רשימה, חיפוש, פרופיל לקוח, טאבים (עסקאות, פגישות, קבצים, הערות) |
| 4 | **פיננסי** | Revenue breakdown, הוצאות לפי קטגוריה, CAC, ROAS, גרף מגמות |
| 5 | **בקשות** | הצגת applications, סינון סטטוס, פרטי בקשה |
| 6 | **קמפיינים** | טבלת קמפיינים, מטריקות |
| 7 | **תוכן** | Content metrics |
| 8 | **פגישות** | רשימת פגישות, סוג, סטטוס |
| 9 | **יעדים** | יעד נוכחי, התקדמות, היסטוריה |
| 10 | **משימות** | Kanban, drag-drop, CRUD, פילטרים — כבר עובד |
| 11 | **הגדרות** | placeholder page |

אם דף נופל → מתקן מיידית.

---

### שלב 4: Import משימות אמיתיות ⏱️ 10 דק
> **מי:** Claude לבד

1. מריץ `import-local.ts` → מייבא 68 משימות ל-Supabase (דרך bulk API)
2. מוודא שמשימות מופיעות ב-UI עם פילטרים תקינים
3. מוחק את `data/tasks.json` (לא צריך יותר ב-Supabase mode)

---

### שלב 5: Deploy ל-Vercel ⏱️ 15 דק
> **מי:** Claude (אם יש Vercel CLI) / בן (אם צריך חשבון חדש)

1. **Vercel Setup:**
   - `npx vercel` → מקשר לפרויקט
   - מוסיף Environment Variables (כל מה שב-.env.local)
   - Build + Deploy

2. **Domain:**
   - אם לבן יש דומיין → מחבר subdomain (לדוגמה: `crm.one-tm.com`)
   - אם אין → URL של Vercel (`one-crm.vercel.app`)

3. **בדיקת production:**
   - כל 12 הדפים עובדים
   - Auth פועל (login/logout)
   - Mobile responsive

---

### שלב 6: Webhooks + אוטומציות ⏱️ 30 דק
> **מי:** Claude לבד (לאחר deploy)

1. **Fillout Webhook:**
   - URL: `https://[domain]/api/webhook/fillout`
   - מטרה: כל מי שממלא טופס → נוצר כליד + application אוטומטית

2. **Cardcom Webhook:**
   - URL: `https://[domain]/api/webhook/cardcom`
   - מטרה: תשלום הצליח → טרנזקציה נוצרת אוטומטית

3. **UPay Webhook:**
   - URL: `https://[domain]/api/webhook/upay`
   - מטרה: כנ"ל

4. **N8N (אופציונלי — שלב 7):**
   - Lead sync מ-Google Sheets
   - Gmail → lead detection
   - Payment notifications

---

### שלב 7: שדרוגים מעבר לתשתית נועם ⏱️ לפי צורך
> **מי:** Claude + בן (לפי עדיפות)

שדרוגים שאנחנו כבר בנינו או שנדרשים ל-ONE™:

| שדרוג | סטטוס | תיאור |
|-------|-------|-------|
| **Tasks module מלא** | ✅ בוצע | Kanban + drag-drop + CRUD + import |
| **Lead Scoring** | ✅ קיים (נועם) | fit + engagement + decay — צריך לכייל ל-ONE™ |
| **Funnel ללא שיחות מכירה** | 🔧 להתאים | Stages של ONE™: content → engaged → applied → onboarding → active (בלי sales_call) |
| **Offer Doc tracking** | 🆕 להוסיף | funnel event: `visited_offer_doc` — כבר ב-enum |
| **Skool integration** | 🆕 להוסיף | חיבור Skool username ללקוח — field כבר קיים |
| **Telegram notifications** | 🆕 להוסיף | התראות על ליד חדש / תשלום |
| **Email templates** | 🆕 להוסיף | תבניות מייל ב-Gmail MCP |
| **Analytics dashboard** | 🔧 לשדרג | CAC לפי source, conversion rate לפי stage |

---

## סדר עדיפויות

```
שלב 1 (Supabase) ← בלוקר — חובה ראשון
  ↓
שלב 2 (Seed) ← תלוי ב-1
  ↓
שלב 3 (אימות UI) ← תלוי ב-2
  ↓
שלב 4 (Import tasks) ← תלוי ב-1
  ↓
שלב 5 (Deploy) ← תלוי ב-3
  ↓
שלב 6 (Webhooks) ← תלוי ב-5
  ↓
שלב 7 (שדרוגים) ← לפי צורך
```

**שלבים 1-5 = CRM מלא עובד עם UI.**
**שלבים 6-7 = אוטומציות + שדרוגים.**

---

## מה צריך מבן

| # | מה | מתי | זמן |
|---|-----|------|------|
| 1 | ליצור Supabase project + להעביר 3 מפתחות | **עכשיו** | 2 דק |
| 2 | לאשר domain (אם יש) | שלב 5 | 1 דק |
| 3 | Vercel account (אם אין) | שלב 5 | 2 דק |
| 4 | Fillout/Cardcom/UPay credentials | שלב 6 | 5 דק |

**הכל השאר — Claude עושה לבד.**

---

## Estimated Timeline

| שלב | זמן |
|------|------|
| 1-4 (DB + Seed + UI + Tasks) | ~75 דק |
| 5 (Deploy) | ~15 דק |
| 6 (Webhooks) | ~30 דק |
| **סה"כ עד CRM עובד ב-production** | **~2 שעות** |
