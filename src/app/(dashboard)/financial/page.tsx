import { Suspense } from "react";
import { Banknote } from "lucide-react";
import { getFinancialData, getRevenueTrends } from "@/lib/queries/financial";
import { KpiRow } from "@/components/financial/kpi-row";
import { RevenueBreakdown } from "@/components/financial/revenue-breakdown";
import { ExpenseBreakdown } from "@/components/financial/expense-breakdown";
import { MarketingMetricsTable } from "@/components/financial/marketing-metrics-table";
import { TrendsChart } from "@/components/financial/trends-chart";
import { PeriodSelector } from "@/components/financial/period-selector";

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

  const [financialData, trends] = await Promise.all([
    getFinancialData(startDate, endDate),
    getRevenueTrends(period === "year" ? 12 : period === "quarter" ? 3 : 6),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
            <Banknote size={20} className="text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">דוח פיננסי</h1>
            <p className="text-sm text-gray-500">סקירת הכנסות, הוצאות ורווחיות</p>
          </div>
        </div>

        <Suspense fallback={null}>
          <PeriodSelector />
        </Suspense>
      </div>

      {/* KPI Cards */}
      <KpiRow
        revenue={financialData.revenue.total}
        expenses={financialData.costs.total}
        profit={financialData.profit}
        roi={financialData.roi}
      />

      {/* Breakdowns - side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueBreakdown
          freedom={financialData.revenue.freedom}
          simplyGrow={financialData.revenue.simplyGrow}
        />
        <ExpenseBreakdown byCategory={financialData.costs.byCategory} />
      </div>

      {/* Marketing Metrics Table */}
      <MarketingMetricsTable
        freedom={financialData.marketing.freedom}
        simplyGrow={financialData.marketing.simplyGrow}
      />

      {/* Trends Chart */}
      <TrendsChart
        transactions={trends.transactions}
        expenses={trends.expenses}
        campaigns={trends.campaigns}
      />
    </div>
  );
}
