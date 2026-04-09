"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { NexusMetric } from "@/components/agents/ui/nexus-metric";
import { NexusCardSkeleton } from "@/components/agents/ui/nexus-skeleton";
import { DollarSign } from "lucide-react";
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
  return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
}

export default function CostsPage() {
  const [rangeDays, setRangeDays] = useState(7);
  const { from, to } = useMemo(() => getDateRange(rangeDays), [rangeDays]);

  const { data, isLoading } = useSWR<AgentCostLog[]>(
    `/api/agents/costs?from=${from}&to=${to}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const totalCost = useMemo(() => data?.reduce((sum, r) => sum + Number(r.cost_usd), 0) || 0, [data]);
  const totalTokens = useMemo(() => data?.reduce((sum, r) => sum + Number(r.input_tokens) + Number(r.output_tokens), 0) || 0, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--nexus-text-1)" }}>מעקב עלויות</h2>
          <p className="text-sm" style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}>
            {from} — {to}
          </p>
        </div>
        <div
          className="flex items-center gap-1 rounded-xl p-1"
          style={{ background: "var(--nexus-bg-card)", border: "1px solid var(--nexus-border)" }}
        >
          {ranges.map((r) => (
            <button
              key={r.days}
              onClick={() => setRangeDays(r.days)}
              className="px-3 py-1.5 rounded-lg text-sm transition-colors"
              style={{
                background: rangeDays === r.days ? "var(--nexus-bg-elevated)" : "transparent",
                color: rangeDays === r.days ? "var(--nexus-text-1)" : "var(--nexus-text-3)",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NexusMetric
          value={isLoading ? "..." : `$${totalCost.toFixed(2)}`}
          label="סה״כ עלות"
          icon={<DollarSign size={20} />}
          accentColor="#00D4FF"
        />
        <NexusMetric
          value={isLoading ? "..." : `${(totalTokens / 1_000_000).toFixed(1)}M`}
          label="טוקנים"
          icon={<span className="text-lg font-bold">T</span>}
          accentColor="#C084FC"
        />
        <NexusMetric
          value={isLoading ? "..." : `$${(totalCost / Math.max(rangeDays, 1)).toFixed(2)}`}
          label="ממוצע יומי"
          icon={<span className="text-lg font-bold">#</span>}
          accentColor="#22C55E"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <NexusCardSkeleton />
          <NexusCardSkeleton />
        </div>
      ) : (
        <>
          <div className="nexus-card p-5">
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--nexus-text-1)" }}>עלות יומית</h3>
            <CostOverviewChart data={data || []} />
          </div>
          <div className="nexus-card p-5">
            <h3 className="text-sm font-medium mb-4" style={{ color: "var(--nexus-text-1)" }}>טופ 10 אייג׳נטים לפי עלות</h3>
            <CostAgentBreakdown data={data || []} />
          </div>
        </>
      )}
    </div>
  );
}
