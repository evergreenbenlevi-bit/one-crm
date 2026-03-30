import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export const getFinancialData = unstable_cache(
  async (startDate: string, endDate: string) => {
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

    const oneCoreRevenue = transactions.filter(t => t.program === "one_core").reduce((sum, t) => sum + Number(t.amount), 0);
    const oneVipRevenue = transactions.filter(t => t.program === "one_vip").reduce((sum, t) => sum + Number(t.amount), 0);

    const oneCoreLeads = transactions.filter(t => t.program === "one_core").length;
    const oneVipLeads = transactions.filter(t => t.program === "one_vip").length;
    const totalPurchases = oneCoreLeads + oneVipLeads;

    const expensesByCategory: Record<string, number> = { meta_ads: metaSpend };
    expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
    });

    return {
      revenue: { total: totalRevenue, oneCore: oneCoreRevenue, oneVip: oneVipRevenue },
      costs: { total: totalCost, byCategory: expensesByCategory },
      profit: totalRevenue - totalCost,
      roi: totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalCost) * 100) : 0,
      marketing: {
        oneCore: {
          cpl: leadsCount > 0 ? Math.round((metaSpend / leadsCount) * 10) / 10 : 0,
          cac: oneCoreLeads > 0 ? Math.round(metaSpend / oneCoreLeads) : 0,
          roas: metaSpend > 0 ? Math.round((oneCoreRevenue / metaSpend) * 100) : 0,
          conversion: leadsCount > 0 ? Math.round((oneCoreLeads / leadsCount) * 1000) / 10 : 0,
        },
        oneVip: {
          cpl: leadsCount > 0 ? Math.round((metaSpend / leadsCount) * 10) / 10 : 0,
          cac: oneVipLeads > 0 ? Math.round(metaSpend / oneVipLeads) : 0,
          roas: metaSpend > 0 ? Math.round((oneVipRevenue / metaSpend) * 100) : 0,
          conversion: leadsCount > 0 ? Math.round((oneVipLeads / leadsCount) * 1000) / 10 : 0,
        },
      },
    };
  },
  ["financial-data"],
  { revalidate: 300, tags: ["transactions", "expenses"] }
);

export const getRevenueTrends = unstable_cache(
  async (months = 6) => {
    const supabase = await createClient();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, date, program")
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
  },
  ["revenue-trends"],
  { revalidate: 300, tags: ["transactions", "expenses", "campaigns"] }
);
