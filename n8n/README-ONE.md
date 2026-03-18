# N8N Workflows — ONE™ CRM
> Ready to import into N8N once installed.

## Workflows

### 1. sync-one-leads.json
**Trigger:** Every 15 minutes
**Source:** Google Sheets (ONE™ lead tracking sheet)
**Flow:**
1. Read leads from Google Sheets
2. Check for duplicates (email + phone)
3. Map statuses: Hebrew → enum
4. Create/update leads in Supabase
5. If lead has payment → create customer + transaction

**Statuses mapping:**
| Hebrew in Sheet | CRM enum |
|----------------|----------|
| חדש | new |
| צרך תוכן | consumed_content |
| ביצע אינטראקציה | engaged |
| הגיש בקשה | applied |
| מתאים | qualified |
| בקליטה | onboarding |
| לקוח פעיל | active_client |
| סיים | completed |
| אבוד | lost |

**Setup:**
1. Create Google Sheets connection in N8N
2. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
3. Update sheet ID in workflow
4. Import JSON and activate

### 2. gmail-lead-detection.json (TO BUILD)
**Trigger:** Gmail webhook / poll
**Flow:**
1. Scan incoming emails for lead indicators
2. Extract name, email, phone
3. Create lead in CRM with source 'organic'
4. Log to automations_log

### 3. payment-webhook.json (TO BUILD)
**Trigger:** Cardcom/Upay webhook
**Flow:**
1. Receive payment notification
2. Find/create customer
3. Create transaction
4. Update lead status → active_client
5. Log funnel event 'purchased'

## Credentials needed:
- Google Sheets OAuth
- Supabase service role key
- Cardcom webhook secret (if using)
- Upay API credentials (if using)
