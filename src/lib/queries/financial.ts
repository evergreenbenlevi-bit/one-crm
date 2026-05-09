import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const getFinancialData = unstable_cache(
  async (startDate: string, endDate: string) => {
    const supabase = createAdminClient();

    const [transactionsRes, expensesRes, campaignsRes, leadsRes] = await Promise.all([
      supabase.from("transactions").select("amount, date, program, status").gte("date", startDate).lte("date", endDate).eq("status", "completed"),
      supabase.from("expenses").select("amount, date, category, paid_by, split_ratio").gte("date", startDate.split("T")[0]).lte("date", endDate.split("T")[0]),
      supabase.from("campaigns").select("daily_spend, date").gte("date", startDate.split("T")[0]).lte("date", endDate.split("T")[0]),
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
    let benPaid = 0;
    let evyatarPaid = 0;
    expenses.forEach(e => {
      expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
      const amount = Number(e.amount);
      if (e.paid_by === "ben") benPaid += amount;
      else if (e.paid_by === "evyatar") evyatarPaid += amount;
      else { benPaid += amount * 0.5; evyatarPaid += amount * 0.5; }
    });

    return {
      revenue: { total: totalRevenue, oneCore: oneCoreRevenue, oneVip: oneVipRevenue },
      costs: { total: totalCost, byCategory: expensesByCategory },
      partners: { benPaid: Math.round(benPaid * 100) / 100, evyatarPaid: Math.round(evyatarPaid * 100) / 100 },
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

// DB-canonical funnel stages in order
export const FUNNEL_STAGES = [
  "new",
  "consumed_content",
  "engaged",
  "applied",
  "qualified",
  "onboarding",
  "active_client",
] as const;

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

/** Source label map — DB enum values → display labels */
export const SOURCE_LABELS: Record<string, string> = {
  campaign: "Meta Ads",
  organic: "Organic",
  youtube: "YouTube",
  referral: "Referral",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  content: "Content",
  webinar: "Webinar",
  skool: "Skool",
  other: "Other",
};

/** Funnel stage label map */
export const STAGE_LABELS: Record<string, string> = {
  new: "New",
  consumed_content: "Content",
  engaged: "Engaged",
  applied: "Applied",
  qualified: "Qualified",
  onboarding: "Onboarding",
  active_client: "Client",
};

export const getLeadAnalytics = unstable_cache(
  async (startDate: string, endDate: string) => {
    const supabase = createAdminClient();

    const { data: leads } = await supabase
      .from("leads")
      .select("source, current_status")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    const rows = leads || [];

    // Leads by source
    const leadsBySource: Record<string, number> = {};
    for (const l of rows) {
      const src = (l.source as string) || "other";
      leadsBySource[src] = (leadsBySource[src] || 0) + 1;
    }

    // Funnel counts by stage
    const funnelCounts = FUNNEL_STAGES.reduce(
      (acc, stage) => {
        acc[stage] = rows.filter((l) => l.current_status === stage).length;
        return acc;
      },
      {} as Record<FunnelStage, number>
    );

    // Stage-to-stage conversion rates
    const stageConversionRates = FUNNEL_STAGES.slice(0, -1).map((stage, i) => {
      const current = funnelCounts[stage];
      const next = funnelCounts[FUNNEL_STAGES[i + 1]];
      return {
        from: stage,
        to: FUNNEL_STAGES[i + 1],
        fromLabel: STAGE_LABELS[stage] || stage,
        toLabel: STAGE_LABELS[FUNNEL_STAGES[i + 1]] || FUNNEL_STAGES[i + 1],
        rate: current > 0 ? Math.round((next / current) * 100) : 0,
      };
    });

    return { leadsBySource, funnelCounts, stageConversionRates, total: rows.length };
  },
  ["lead-analytics"],
  { revalidate: 300, tags: ["leads"] }
);

export const getRevenueTrends = unstable_cache(
  async (months = 6) => {
    const supabase = createAdminClient();
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
