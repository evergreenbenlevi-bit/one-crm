import { createClient } from "@/lib/supabase/server";

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

  // Revenue
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .gte("date", startISO)
    .eq("status", "completed");

  const totalRevenue = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const freedomRevenue = transactions?.filter(t => t.product === "freedom").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const simplyGrowRevenue = transactions?.filter(t => t.product === "simply_grow").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const freedomCount = transactions?.filter(t => t.product === "freedom").length || 0;
  const simplyGrowCount = transactions?.filter(t => t.product === "simply_grow").length || 0;

  // Leads
  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startISO);

  // Ad spend
  const { data: campaignData } = await supabase
    .from("campaigns")
    .select("daily_spend")
    .gte("date", startISO.split("T")[0]);

  const totalSpend = campaignData?.reduce((sum, c) => sum + Number(c.daily_spend), 0) || 0;
  const costPerLead = leadsCount && leadsCount > 0 ? totalSpend / leadsCount : 0;

  // Purchases count for CAC
  const purchaseCount = (freedomCount || 0) + (simplyGrowCount || 0);
  const cac = purchaseCount > 0 ? totalSpend / purchaseCount : 0;
  const conversionRate = leadsCount && leadsCount > 0 ? (purchaseCount / leadsCount) * 100 : 0;
  const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;

  return {
    revenue: {
      total: totalRevenue,
      freedom: freedomRevenue,
      simplyGrow: simplyGrowRevenue,
      freedomCount,
      simplyGrowCount,
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
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("leads_count", { ascending: false })
    .limit(limit);

  return data || [];
}

export async function getHotLeads() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("*")
    .in("current_status", ["filled_questionnaire", "sales_call", "got_wa", "watched_vsl"])
    .neq("current_status", "closed")
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
    .lte("program_end_date", thirtyDaysFromNow.toISOString().split("T")[0])
    .order("program_end_date", { ascending: true });

  return data || [];
}

export async function getRevenueChart() {
  const supabase = await createClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data } = await supabase
    .from("transactions")
    .select("amount, date, product")
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
