import { generateText, tool, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCRMContext } from '@/lib/crm-context'

// Simple CRM access key for Jarvis — stored in env
const CRM_QUERY_SECRET = process.env.CRM_QUERY_SECRET

export async function POST(req: Request) {
  // Validate Jarvis secret
  const authHeader = req.headers.get('x-crm-secret')
  if (CRM_QUERY_SECRET && authHeader !== CRM_QUERY_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { query } = await req.json()
  if (!query) return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 })

  const crmContext = await getCRMContext()

  const { text } = await generateText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: `אתה ONE-AI, העוזר האישי של בן ב-ONE-CRM.
אתה עונה בעברית, קצר ומובנה לטלגרם (bullets, לא headers, לא tables).
השתמש בכלים כדי לענות על שאלות אמיתיות.

${crmContext.summary}`,
    prompt: query,
    stopWhen: stepCountIs(4),
    tools: {
      searchLeads: tool({
        description: 'חפש לידים לפי שם, סטטוס, או תוכן חופשי.',
        inputSchema: z.object({
          query: z.string().optional(),
          status: z.enum(['new', 'consumed_content', 'engaged', 'applied', 'qualified', 'onboarding', 'active_client', 'completed', 'lost']).optional(),
          program: z.enum(['one_core', 'one_vip']).optional(),
        }),
        execute: async ({ query, status, program }) => {
          const supabase = createAdminClient()
          let q = supabase.from('leads').select('id, name, email, phone, current_status, program, created_at, lead_score').order('updated_at', { ascending: false }).limit(10)
          if (query) q = q.or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          if (status) q = q.eq('current_status', status)
          if (program) q = q.eq('program', program)
          const { data, error } = await q
          if (error) return { error: error.message }
          return { leads: data || [], count: data?.length || 0 }
        },
      }),

      getLeadDetails: tool({
        description: 'קבל פרטים מלאים על ליד ספציפי.',
        inputSchema: z.object({
          nameOrId: z.string(),
        }),
        execute: async ({ nameOrId }) => {
          const supabase = createAdminClient()
          const isUuid = /^[0-9a-f-]{36}$/i.test(nameOrId)
          const { data: leads } = await supabase.from('leads').select('*').match(isUuid ? { id: nameOrId } : {}).ilike(isUuid ? 'id' : 'name', isUuid ? nameOrId : `%${nameOrId}%`).limit(1)
          const lead = leads?.[0]
          if (!lead) return { error: `לא נמצא: ${nameOrId}` }
          const [notesRes] = await Promise.all([
            supabase.from('notes').select('content, created_at').eq('lead_id', lead.id).order('created_at', { ascending: false }).limit(3),
          ])
          return { lead, notes: notesRes.data || [] }
        },
      }),

      updateLeadStatus: tool({
        description: 'עדכן סטטוס ליד.',
        inputSchema: z.object({
          leadId: z.string().uuid(),
          newStatus: z.enum(['new', 'consumed_content', 'engaged', 'applied', 'qualified', 'onboarding', 'active_client', 'completed', 'lost']),
        }),
        execute: async ({ leadId, newStatus }) => {
          const supabase = createAdminClient()
          const { data, error } = await supabase.from('leads').update({ current_status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId).select('name, current_status').single()
          if (error) return { error: error.message }
          return { success: true, lead: data }
        },
      }),

      addNote: tool({
        description: 'הוסף הערה לליד.',
        inputSchema: z.object({
          leadId: z.string().uuid(),
          content: z.string(),
        }),
        execute: async ({ leadId, content }) => {
          const supabase = createAdminClient()
          const { error } = await supabase.from('notes').insert({ lead_id: leadId, content, created_by: 'jarvis' })
          if (error) return { error: error.message }
          return { success: true }
        },
      }),

      getRevenueSummary: tool({
        description: 'הכנסות לתקופה.',
        inputSchema: z.object({
          period: z.enum(['today', 'week', 'month', 'quarter', 'year']),
        }),
        execute: async ({ period }) => {
          const supabase = createAdminClient()
          const now = new Date()
          const startMap: Record<string, Date> = {
            today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            week: new Date(now.setDate(now.getDate() - 7)),
            month: new Date(now.getFullYear(), now.getMonth(), 1),
            quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
            year: new Date(now.getFullYear(), 0, 1),
          }
          const { data } = await supabase.from('transactions').select('amount, program').gte('date', startMap[period].toISOString()).eq('status', 'completed')
          const total = (data || []).reduce((s, t) => s + (Number(t.amount) || 0), 0)
          return { period, total: `₪${total.toLocaleString('he-IL')}`, count: data?.length || 0 }
        },
      }),
    },
  })

  return new Response(JSON.stringify({ response: text }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
