import { createClient } from "@/lib/supabase/server";

export async function getFinancialData(startDate: string, endDate: string) {
  const supabase = await createClient();

  const [transactionsRes, expensesRes, campaignsRes, leadsRes] = await Promise.all([
    supabase.from("transactions").select("*").gte("date", startDate).lte("date", endDate).eq("status", "completed"),
    supabase.from("expenses").select("*").gte("date", startDate.split("T")[0]).lte("date", endDate.split("T")[0]),
    supabase.from("campaigns").select("*").gte("date", startDate.split("T")[0]).lte("date", endDate.split("T")[0]),
    supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", startDate).lte("created_at", endDate),
  ]);

  const transactions = transactionsRes.data || [];
  const expenses = expensesRes.data || [];
  const campaigns = campaignsRes.data || [];
  const leadsCount = leadsRes.count || 0;

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const metaSpend = campaigns.reduce((sum, c) => sum + Number(c.daily_spend), 0);
  const totalCost = totalExpenses + metaSpend;

  const freedomRevenue = transactions.filter(t => t.product === "freedom").reduce((sum, t) => sum + Number(t.amount), 0);
  const simplyGrowRevenue = transactions.filter(t => t.product === "simply_grow").reduce((sum, t) => sum + Number(t.amount), 0);

  const freedomLeads = transactions.filter(t => t.product === "freedom").length;
  const simplyGrowLeads = transactions.filter(t => t.product === "simply_grow").length;
  const totalPurchases = freedomLeads + simplyGrowLeads;

  const expensesByCategory: Record<string, number> = { meta_ads: metaSpend };
  expenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
  });

  return {
    revenue: { total: totalRevenue, freedom: freedomRevenue, simplyGrow: simplyGrowRevenue },
    costs: { total: totalCost, byCategory: expensesByCategory },
    profit: totalRevenue - totalCost,
    roi: totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0,
    marketing: {
      freedom: {
        cpl: leadsCount > 0 ? Math.round((metaSpend / leadsCount) * 10) / 10 : 0,
        cac: freedomLeads > 0 ? Math.round(metaSpend / freedomLeads) : 0,
        roas: metaSpend > 0 ? Math.round((freedomRevenue / metaSpend) * 100) : 0,
        conversion: leadsCount > 0 ? Math.round((freedomLeads / leadsCount) * 1000) / 10 : 0,
      },
      simplyGrow: {
        cpl: leadsCount > 0 ? Math.round((metaSpend / leadsCount) * 10) / 10 : 0,
        cac: simplyGrowLeads > 0 ? Math.round(metaSpend / simplyGrowLeads) : 0,
        roas: metaSpend > 0 ? Math.round((simplyGrowRevenue / metaSpend) * 100) : 0,
        conversion: leadsCount > 0 ? Math.round((simplyGrowLeads / leadsCount) * 1000) / 10 : 0,
      },
    },
  };
}

export async function getRevenueTrends(months = 6) {
  const supabase = await createClient();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, date, product")
    .gte("date", startDate.toISOString())
    .eq("status", "completed")
    .order("date");

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, date")
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date");

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("daily_spend, date")
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date");

  return { transactions: transactions || [], expenses: expenses || [], campaigns: campaigns || [] };
}
