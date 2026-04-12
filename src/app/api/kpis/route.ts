/**
 * /api/kpis — Business KPI computation engine
 * Phase A1: CRM Redesign V2
 *
 * Returns: ROAS, CAC, LTV, retention, churn, net_profit, CPL, CTR, CPC, conversion_funnel, avg_deal_size
 */
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/api-auth";

function getPeriodRange(period: string): { startDate: string; endDate: string } {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59); // last day of month
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function round(n: number, decimals = 2): number {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

const VAT_RATE = 0.18;
const INCOME_TAX_RATE = 0.23;

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Period: default to current month
  const rawPeriod =
    req.nextUrl.searchParams.get("period") ||
    (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();

  const { startDate, endDate } = getPeriodRange(rawPeriod);
  const startDateOnly = startDate.split("T")[0];
  const endDateOnly = endDate.split("T")[0];

  const supabase = createAdminClient();

  // Parallel data fetch
  const [transactionsRes, expensesRes, campaignsRes, leadsRes, customersRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, date, program, status")
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("status", "completed"),
    supabase
      .from("expenses")
      .select("amount, category, date")
      .gte("date", startDateOnly)
      .lte("date", endDateOnly),
    supabase
      .from("campaigns")
      .select("daily_spend, impressions, clicks, leads_count, date")
      .gte("date", startDateOnly)
      .lte("date", endDateOnly),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startDate)
      .lte("created_at", endDate),
    supabase.from("customers").select("total_paid, status"),
  ]);

  const transactions = transactionsRes.data || [];
  const expenses = expensesRes.data || [];
  const campaigns = campaignsRes.data || [];
  const leadsCount = leadsRes.count || 0;
  const customers = customersRes.data || [];

  // Revenue (incl. VAT)
  const grossRevenue = transactions.reduce((s, t) => s + Number(t.amount), 0);
  const revenueExVat = grossRevenue / (1 + VAT_RATE);

  // Ad spend: campaigns daily_spend + expenses with ad categories
  const AD_CATEGORIES = ["meta_ads", "google_ads", "facebook_ads", "ads", "advertising"];
  const campaignSpend = campaigns.reduce((s, c) => s + Number(c.daily_spend), 0);
  const expenseAdSpend = expenses
    .filter((e) => AD_CATEGORIES.some((cat) => e.category?.toLowerCase().includes(cat)))
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalAdSpend = campaignSpend + expenseAdSpend;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0) + campaignSpend;
  const totalExpensesExVat = totalExpenses / (1 + VAT_RATE);

  // Clicks + impressions from campaigns
  const totalImpressions = campaigns.reduce((s, c) => s + (Number(c.impressions) || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (Number(c.clicks) || 0), 0);
  const campaignLeads = campaigns.reduce((s, c) => s + (Number(c.leads_count) || 0), 0);

  // New customers this period
  const newCustomers = transactions.filter(
    (t, i, arr) =>
      arr.findIndex((x) => x.program === t.program) === i
  ).length; // rough proxy: unique program purchases
  const purchasesCount = transactions.length;

  // Customer-level stats
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const totalCustomers = customers.length;
  const avgTotalPaid =
    customers.length > 0
      ? customers.reduce((s, c) => s + Number(c.total_paid), 0) / customers.length
      : 0;

  // KPI calculations
  const roas = totalAdSpend > 0 ? round(grossRevenue / totalAdSpend) : 0;
  const cac = purchasesCount > 0 ? round(totalAdSpend / purchasesCount) : 0;
  const ltv = round(avgTotalPaid);
  const retentionRate =
    totalCustomers > 0 ? round((activeCustomers / totalCustomers) * 100) : 100;
  const churnRate = round(100 - retentionRate);
  const cpl =
    leadsCount > 0
      ? round(totalAdSpend / leadsCount)
      : campaignLeads > 0
      ? round(totalAdSpend / campaignLeads)
      : 0;
  const ctr = totalImpressions > 0 ? round((totalClicks / totalImpressions) * 100) : 0;
  const cpc = totalClicks > 0 ? round(totalAdSpend / totalClicks) : 0;
  const avgDealSize = transactions.length > 0 ? round(grossRevenue / transactions.length) : 0;

  // Net profit (after VAT + income tax)
  const profitBeforeTax = revenueExVat - totalExpensesExVat;
  const incomeTax = Math.max(0, profitBeforeTax) * INCOME_TAX_RATE;
  const netProfit = round(profitBeforeTax - incomeTax);

  // VAT breakdown
  const vatCollected = round(grossRevenue * VAT_RATE / (1 + VAT_RATE));
  const vatInput = round(totalExpenses * VAT_RATE / (1 + VAT_RATE));
  const vatNet = round(vatCollected - vatInput);

  return NextResponse.json({
    period: rawPeriod,
    // Core 6 KPIs
    roas,
    cac,
    ltv,
    retention_rate: retentionRate,
    churn_rate: churnRate,
    net_profit: netProfit,
    // Extended KPIs
    cpl,
    ctr,
    cpc,
    avg_deal_size: avgDealSize,
    // Raw numbers
    gross_revenue: round(grossRevenue),
    revenue_ex_vat: round(revenueExVat),
    total_ad_spend: round(totalAdSpend),
    total_expenses: round(totalExpenses),
    profit_before_tax: round(profitBeforeTax),
    income_tax: round(incomeTax),
    vat_collected: vatCollected,
    vat_input: vatInput,
    vat_net: vatNet,
    // Funnel
    conversion_funnel: {
      leads: leadsCount + campaignLeads,
      webinar_registered: 0,
      webinar_attended: 0,
      sales: purchasesCount,
    },
    // Meta
    note_roas: totalAdSpend === 0 ? "אין נתוני קמפיינים — הזן הוצאות פרסום לחישוב ROAS" : null,
    note_ltv: customers.length === 0 ? "אין לקוחות בDB — הזן לקוחות לחישוב LTV" : null,
  });
}
