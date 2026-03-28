import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCRMContext } from '@/lib/crm-context'

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Phase 2: Inject real CRM context before every query
  const crmContext = await getCRMContext()

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: `אתה ONE-AI, העוזר האישי של בן ב-ONE-CRM.
אתה יכול לחפש לידים, לקוחות, לעדכן סטטוסים, להוסיף הערות, ולבדוק נתוני הכנסות.
תמיד תענה בעברית, קצר וממוקד.
אם אין לך מידע ספציפי — השתמש בכלים כדי לחפש.

${crmContext.summary}`,
    messages: modelMessages,
    stopWhen: stepCountIs(5),

    // Phase 3: Tool Calling
    tools: {
      searchLeads: tool({
        description: 'חפש לידים לפי שם, סטטוס, או תוכן חופשי. מחזיר עד 10 תוצאות.',
        inputSchema: z.object({
          query: z.string().optional().describe('חיפוש טקסט חופשי — שם, אימייל, טלפון'),
          status: z.enum(['new', 'consumed_content', 'engaged', 'applied', 'qualified', 'onboarding', 'active_client', 'completed', 'lost']).optional(),
          program: z.enum(['one_core', 'one_vip']).optional(),
        }),
        execute: async ({ query, status, program }) => {
          const supabase = createAdminClient()
          let q = supabase
            .from('leads')
            .select('id, name, email, phone, current_status, program, created_at, lead_score, pain_points')
            .order('updated_at', { ascending: false })
            .limit(10)
          if (query) q = q.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          if (status) q = q.eq('current_status', status)
          if (program) q = q.eq('program', program)
          const { data, error } = await q
          if (error) return { error: error.message }
          return { leads: data || [], count: data?.length || 0 }
        },
      }),

      getLeadDetails: tool({
        description: 'קבל פרטים מלאים על ליד ספציפי לפי שם או ID, כולל הערות והיסטוריה.',
        inputSchema: z.object({
          nameOrId: z.string().describe('שם הליד או ה-UUID שלו'),
        }),
        execute: async ({ nameOrId }) => {
          const supabase = createAdminClient()
          const isUuid = /^[0-9a-f-]{36}$/i.test(nameOrId)
          let leadQuery = supabase.from('leads').select('*')
          if (isUuid) {
            leadQuery = leadQuery.eq('id', nameOrId)
          } else {
            leadQuery = leadQuery.ilike('name', `%${nameOrId}%`)
          }
          const { data: leads } = await leadQuery.limit(1)
          const lead = leads?.[0]
          if (!lead) return { error: `לא נמצא ליד: ${nameOrId}` }

          const [notesRes, eventsRes] = await Promise.all([
            supabase.from('notes').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('funnel_events').select('*').eq('lead_id', lead.id).order('timestamp', { ascending: false }).limit(5),
          ])

          return { lead, notes: notesRes.data || [], events: eventsRes.data || [] }
        },
      }),

      updateLeadStatus: tool({
        description: 'עדכן את הסטטוס של ליד.',
        inputSchema: z.object({
          leadId: z.string().uuid().describe('ה-ID של הליד'),
          newStatus: z.enum(['new', 'consumed_content', 'engaged', 'applied', 'qualified', 'onboarding', 'active_client', 'completed', 'lost']),
        }),
        execute: async ({ leadId, newStatus }) => {
          const supabase = createAdminClient()
          const { data, error } = await supabase
            .from('leads')
            .update({ current_status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', leadId)
            .select('name, current_status')
            .single()
          if (error) return { error: error.message }
          return { success: true, lead: data, message: `סטטוס עודכן ל-${newStatus}` }
        },
      }),

      addNote: tool({
        description: 'הוסף הערה לליד.',
        inputSchema: z.object({
          leadId: z.string().uuid().describe('ה-ID של הליד'),
          content: z.string().describe('תוכן ההערה'),
        }),
        execute: async ({ leadId, content }) => {
          const supabase = createAdminClient()
          const { data, error } = await supabase
            .from('notes')
            .insert({ lead_id: leadId, content, created_by: 'ai-agent' })
            .select()
            .single()
          if (error) return { error: error.message }
          return { success: true, note: data }
        },
      }),

      getRevenueSummary: tool({
        description: 'קבל סיכום הכנסות לתקופה מסוימת.',
        inputSchema: z.object({
          period: z.enum(['today', 'week', 'month', 'quarter', 'year']),
        }),
        execute: async ({ period }) => {
          const supabase = createAdminClient()
          const now = new Date()
          let startDate: Date

          switch (period) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
            case 'week':
              startDate = new Date(now); startDate.setDate(now.getDate() - 7); break
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1); break
            case 'quarter':
              startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break
            case 'year':
              startDate = new Date(now.getFullYear(), 0, 1); break
          }

          const { data } = await supabase
            .from('transactions')
            .select('amount, program, date')
            .gte('date', startDate!.toISOString())
            .eq('status', 'completed')

          const total = (data || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
          const oneCore = (data || []).filter(t => t.program === 'one_core').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
          const oneVip = (data || []).filter(t => t.program === 'one_vip').reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

          return {
            period,
            total: `₪${total.toLocaleString('he-IL')}`,
            oneCore: `₪${oneCore.toLocaleString('he-IL')}`,
            oneVip: `₪${oneVip.toLocaleString('he-IL')}`,
            transactionCount: data?.length || 0,
          }
        },
      }),

      searchCustomers: tool({
        description: 'חפש לקוחות לפי שם.',
        inputSchema: z.object({
          query: z.string().describe('שם הלקוח'),
          status: z.enum(['active', 'completed', 'churned']).optional(),
        }),
        execute: async ({ query, status }) => {
          const supabase = createAdminClient()
          let q = supabase
            .from('customers')
            .select('id, name, email, program, status, total_paid, current_month, program_end_date')
            .order('created_at', { ascending: false })
            .limit(10)
          if (query) q = q.ilike('name', `%${query}%`)
          if (status) q = q.eq('status', status)
          const { data, error } = await q
          if (error) return { error: error.message }
          return { customers: data || [], count: data?.length || 0 }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
