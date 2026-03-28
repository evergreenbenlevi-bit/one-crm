import { createAdminClient } from '@/lib/supabase/admin'

export interface CRMContext {
  summary: string
  hotLeads: Array<{ id: string; name: string; status: string; program: string }>
  recentLeads: Array<{ id: string; name: string; status: string; created_at: string }>
  activeCustomers: number
  monthRevenue: number
}

export async function getCRMContext(): Promise<CRMContext> {
  const supabase = createAdminClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [hotLeadsRes, recentLeadsRes, customersRes, revenueRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, current_status, program')
      .in('current_status', ['applied', 'qualified', 'engaged'])
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('leads')
      .select('id, name, current_status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('transactions')
      .select('amount')
      .gte('date', monthStart)
      .eq('status', 'completed'),
  ])

  const hotLeads = (hotLeadsRes.data || []).map(l => ({
    id: l.id,
    name: l.name,
    status: l.current_status,
    program: l.program,
  }))

  const recentLeads = (recentLeadsRes.data || []).map(l => ({
    id: l.id,
    name: l.name,
    status: l.current_status,
    created_at: l.created_at,
  }))

  const activeCustomers = customersRes.count || 0

  const monthRevenue = (revenueRes.data || []).reduce((sum, t) => {
    const amount = Number(t.amount)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)

  const summary = `
סיכום CRM נוכחי (${now.toLocaleDateString('he-IL')}):
- לידים חמים: ${hotLeads.length} (applied/qualified/engaged)
- לקוחות פעילים: ${activeCustomers}
- הכנסות החודש: ₪${monthRevenue.toLocaleString('he-IL')}
- לידים חדשים אחרונים: ${recentLeads.map(l => l.name).join(', ') || 'אין'}

לידים חמים לפי שם:
${hotLeads.map(l => `- ${l.name} | ${l.status} | ${l.program}`).join('\n') || 'אין לידים חמים כרגע'}
`.trim()

  return { summary, hotLeads, recentLeads, activeCustomers, monthRevenue }
}
