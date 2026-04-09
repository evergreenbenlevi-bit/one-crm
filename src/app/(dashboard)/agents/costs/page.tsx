"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { clsx } from "clsx";
import { DollarSign, Loader2 } from "lucide-react";
import { CostOverviewChart } from "@/components/agents/cost-overview-chart";
import { CostAgentBreakdown } from "@/components/agents/cost-agent-breakdown";
import type { AgentCostLog } from "@/lib/types/agents";

const ranges = [
  { label: "7 ימים", days: 7 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
];

function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function CostsPage() {
  const [rangeDays, setRangeDays] = useState(7);
  const { from, to } = useMemo(() => getDateRange(rangeDays), [rangeDays]);

  const { data, isLoading } = useSWR<AgentCostLog[]>(
    `/api/agents/costs?from=${from}&to=${to}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const totalCost = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, r) => sum + Number(r.cost_usd), 0);
  }, [data]);

  const totalTokens = useMemo(() => {
    if (!data) return 0;
    return data.reduce((sum, r) => sum + Number(r.input_tokens) + Number(r.output_tokens), 0);
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">מעקב עלויות</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{from} — {to}</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {ranges.map((r) => (
            <button
              key={r.days}
              onClick={() => setRangeDays(r.days)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                rangeDays === r.days
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DollarSign className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">סה״כ עלות</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : `$${totalCost.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 text-lg font-bold">T</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">טוקנים</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : `${(totalTokens / 1_000_000).toFixed(1)}M`}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <span className="text-green-600 dark:text-green-400 text-lg font-bold">#</span>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ממוצע יומי</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? "..." : `$${(totalCost / Math.max(rangeDays, 1)).toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : (
        <>
          {/* Daily Line Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">עלות יומית</h3>
            <CostOverviewChart data={data || []} />
          </div>

          {/* Agent Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">טופ 10 אייג׳נטים לפי עלות</h3>
            <CostAgentBreakdown data={data || []} />
          </div>
        </>
      )}
    </div>
  );
}
