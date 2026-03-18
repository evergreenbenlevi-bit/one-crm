# ONE™ CRM — שיפורים נדרשים
> מבוסס על מחקר CRM best practices (2026-03-18)
> מקור: `04_KNOWLEDGE/Research_Results/2026-03-18_crm-best-practices.md`

---

## 🔴 Must-Have (חסר מה-CRM הנוכחי)

### 1. Lead Scoring System
**מה:** מערכת ניקוד אוטומטית לכל ליד (0-100)
**למה:** ~~300% שיפור conversions~~ (Nucleus Research)
**מה צריך:**
- טבלת `lead_scores` עם fit_score + engagement_score
- חישוב אוטומטי שמתעדכן בכל אינטראקציה
- API endpoint: PATCH /api/leads/[id]/score
- UI: badge צבעוני (cold/warm/hot/ready) ב-leads table + kanban
**סטטוס:** ❌ לא קיים

### 2. Application Management
**מה:** דף ניהול בקשות הצטרפות — review, approve, reject
**למה:** ONE™ עובד על application model, לא sales calls
**מה צריך:**
- טבלת `applications` כבר ב-schema ✅
- דף /applications עם: רשימת בקשות, answers view, score, approve/reject buttons
- Webhook: application submitted → Telegram notification
- Auto-response email: "קיבלנו את הבקשה, נחזור אליך תוך 48 שעות"
**סטטוס:** ❌ Schema מוכן, UI חסר

### 3. Content Metrics Dashboard
**מה:** מעקב ביצועי תוכן — איזה פוסט מביא לידים
**למה:** Content-to-lead attribution = הבנה מה עובד
**מה צריך:**
- טבלת `content_metrics` כבר ב-schema ✅
- דף /content עם: טבלת תוכן, views/likes/leads per post
- UTM tracking integration
- Revenue attribution: post → lead → client → ₪
**סטטוס:** ❌ Schema מוכן, UI + API חסרים

### 4. Automated Onboarding Sequence
**מה:** ברגע שלקוח משלם → רצף אוטומטי
**למה:** 40% ירידה ב-churn עם onboarding אוטומטי
**Flow:**
1. Payment received → status = onboarding
2. Welcome email + access credentials
3. Day 1: onboarding guide
4. Day 3: first milestone reminder
5. Day 7: check-in survey
**מה צריך:**
- N8N workflow: payment webhook → email sequence
- Email templates
- Milestone tracking in customer profile
**סטטוס:** ❌ לא קיים

### 5. Automation Log
**מה:** טבלת `automations_log` — מה כל automation עשתה
**למה:** debugging + transparency
**מה צריך:**
- Schema כבר מוכן ✅
- כל webhook/N8N שרץ → כותב log entry
- דף /automations בUI
**סטטוס:** ❌ Schema מוכן, implementation חסר

---

## 🟡 Nice-to-Have (שבוע הבא)

### 6. Client Health Score
Dashboard: ירוק/צהוב/אדום per client. Based on:
- Session attendance
- Email engagement
- Payment status
- Goal progress

### 7. NPS Survey Integration
Auto-send NPS survey at month 1 + program end.
Store scores, trigger alerts for NPS < 7.

### 8. Stage Duration Alerts
Lead stuck in same stage > 14 days → Telegram alert.
Client hasn't engaged in 14 days → warning.

### 9. Revenue Forecasting
Based on pipeline: leads × conversion rate × avg deal size.
Monthly/quarterly forecast display on dashboard.

### 10. WhatsApp/DM Tracking
Log DM interactions in timeline.
Track response times.

---

## 🟢 Future (חודש+)

### 11. AI Lead Scoring
ML model trained on historical conversions.
Predictive scoring that improves over time.

### 12. Client Portal
Self-service area with materials, progress, scheduling.

### 13. Integrated Scheduling
Calendar booking within CRM (no external Calendly).

### 14. AI Churn Prediction
Behavioral patterns → early warning signals.

### 15. Multi-touch Attribution
First + Last touch model for content → revenue tracking.

---

## Execution Order
```
NOW:  Lead Scoring → Applications Page → Content Metrics → Onboarding Flow
WEEK: Health Score → NPS → Stage Alerts → Revenue Forecast
MONTH: AI Scoring → Portal → Scheduling → Attribution
```
