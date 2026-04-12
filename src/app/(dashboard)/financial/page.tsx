import { Suspense } from "react";
import { Banknote } from "lucide-react";
import { getFinancialData, getRevenueTrends } from "@/lib/queries/financial";
import { calculateSettlement } from "@/lib/queries/settlement";
import { KpiRow } from "@/components/financial/kpi-row";
import { RevenueBreakdown } from "@/components/financial/revenue-breakdown";
import { ExpenseBreakdown } from "@/components/financial/expense-breakdown";
import { MarketingMetricsTable } from "@/components/financial/marketing-metrics-table";
import { TrendsChartClient } from "@/components/financial/trends-chart-client";
import { PeriodSelector } from "@/components/financial/period-selector";
import { PartnerSettlement } from "@/components/financial/partner-settlement";
import { ExpenseForm } from "@/components/financial/expense-form";
import { FinancialTabs } from "@/components/financial/financial-tabs";
import { ApiCostsWidget } from "@/components/financial/api-costs-widget";
import { TaxBreakdown } from "@/components/financial/tax-breakdown";

function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString();

  const start = new Date(now);
  if (period === "quarter") {
    start.setMonth(start.getMonth() - 3);
  } else if (period === "year") {
    start.setFullYear(start.getFullYear() - 1);
  } else {
    // month (default)
    start.setMonth(start.getMonth() - 1);
  }

  return { startDate: start.toISOString(), endDate };
}

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function FinancialPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = params.period || "month";
  const { startDate, endDate } = getDateRange(period);

  const periodStartDate = startDate.split("T")[0];
  const periodEndDate = endDate.split("T")[0];

  const [financialData, trends, settlement] = await Promise.all([
    getFinancialData(startDate, endDate),
    getRevenueTrends(period === "year" ? 12 : period === "quarter" ? 3 : 6),
    calculateSettlement(periodStartDate, periodEndDate),
  ]);

  const overviewContent = (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KpiRow
        revenue={financialData.revenue.total}
        expenses={financialData.costs.total}
        profit={financialData.profit}
        roi={financialData.roi}
      />

      {/* Partner Settlement */}
      <PartnerSettlement
        benPaid={settlement.benPaid}
        avitarPaid={settlement.avitarPaid}
        settlementAmount={settlement.settlementAmount}
        periodStart={periodStartDate}
        periodEnd={periodEndDate}
      />

      {/* Tax breakdown — VAT + income tax P&L */}
      <TaxBreakdown
        grossRevenue={financialData.revenue.total}
        totalExpenses={financialData.costs.total}
      />

      {/* Add Expense */}
      <ExpenseForm />

      {/* Breakdowns - side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueBreakdown
          oneCore={financialData.revenue.oneCore}
          oneVip={financialData.revenue.oneVip}
        />
        <ExpenseBreakdown byCategory={financialData.costs.byCategory} />
      </div>

      {/* Marketing Metrics Table */}
      <MarketingMetricsTable
        oneCore={financialData.marketing.oneCore}
        oneVip={financialData.marketing.oneVip}
      />

      {/* Trends Chart */}
      <TrendsChartClient
        transactions={trends.transactions}
        expenses={trends.expenses}
        campaigns={trends.campaigns}
      />

      {/* API & Infrastructure Costs */}
      <ApiCostsWidget />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-xl flex items-center justify-center">
            <Banknote size={20} className="text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold dark:text-gray-100">דוח פיננסי</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">סקירת הכנסות, הוצאות ורווחיות</p>
          </div>
        </div>

        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>

      {/* Tabs: Overview / Receipts / Personal */}
      <FinancialTabs overviewContent={overviewContent} />
    </div>
  );
}
