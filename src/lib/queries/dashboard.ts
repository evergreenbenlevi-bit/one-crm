import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export async function getDashboardData(period: "today" | "week" | "month" = "month") {
  const supabase = await createClient();
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const startISO = startDate.toISOString();
  const startDateStr = format(startDate, "yyyy-MM-dd");

  // Run all queries in parallel instead of sequential N+1
  const [transactionsResult, leadsResult, campaignResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .gte("date", startISO)
      .eq("status", "completed"),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO),
    supabase
      .from("campaigns")
      .select("daily_spend")
      .gte("date", startDateStr),
  ]);

  const transactions = transactionsResult.data;
  const leadsCount = leadsResult.count;
  const campaignData = campaignResult.data;

  const totalRevenue = transactions?.reduce((sum, t) => {
    const amount = Number(t.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0) || 0;

  const oneCoreTransactions = transactions?.filter(t => t.program === "one_core") || [];
  const oneVipTransactions = transactions?.filter(t => t.program === "one_vip") || [];

  const oneCoreRevenue = oneCoreTransactions.reduce((sum, t) => {
    const amount = Number(t.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const oneVipRevenue = oneVipTransactions.reduce((sum, t) => {
    const amount = Number(t.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const oneCoreCount = oneCoreTransactions.length;
  const oneVipCount = oneVipTransactions.length;

  const totalSpend = campaignData?.reduce((sum, c) => {
    const spend = Number(c.daily_spend);
    return sum + (Number.isFinite(spend) ? spend : 0);
  }, 0) || 0;

  const costPerLead = leadsCount && leadsCount > 0 ? totalSpend / leadsCount : 0;
  const purchaseCount = oneCoreCount + oneVipCount;
  const cac = purchaseCount > 0 ? totalSpend / purchaseCount : 0;
  const conversionRate = leadsCount && leadsCount > 0 ? (purchaseCount / leadsCount) * 100 : 0;
  const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  return {
    revenue: {
      total: totalRevenue,
      oneCore: oneCoreRevenue,
      oneVip: oneVipRevenue,
      oneCoreCount,
      oneVipCount,
    },
    leads: {
      count: leadsCount || 0,
      costPerLead: Math.round(costPerLead * 10) / 10,
      cac: Math.round(cac),
      conversionRate: Math.round(conversionRate * 10) / 10,
      roi: Math.round(roi),
    },
    spend: totalSpend,
  };
}

export async function getTopAds(limit = 3) {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .gte("date", format(thirtyDaysAgo, "yyyy-MM-dd"))
    .order("leads_count", { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getHotLeads() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("*")
    .in("current_status", ["applied", "qualified", "engaged", "consumed_content"])
    .neq("current_status", "active_client")
    .neq("current_status", "lost")
    .order("updated_at", { ascending: false })
    .limit(5);

  return data || [];
}

export async function getUpcomingMeetings() {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const twoDaysFromNow = new Date();
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

  const { data } = await supabase
    .from("meetings")
    .select("*, customers(name)")
    .gte("date", now)
    .lte("date", twoDaysFromNow.toISOString())
    .eq("status", "scheduled")
    .order("date", { ascending: true });

  return data || [];
}

export async function getEndingPrograms() {
  const supabase = await createClient();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("status", "active")
    .lte("program_end_date", format(thirtyDaysFromNow, "yyyy-MM-dd"))
    .order("program_end_date", { ascending: true });

  return data || [];
}

export async function getRevenueChart() {
  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data } = await supabase
    .from("transactions")
    .select("amount, date, program")
    .gte("date", sixMonthsAgo.toISOString())
    .eq("status", "completed")
    .order("date", { ascending: true });

  return data || [];
}

export async function getCurrentGoal() {
  const supabase = await createClient();
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();

  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("quarter", quarter)
    .eq("year", year)
    .single();

  return data;
}
