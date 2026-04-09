"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { AgentCostLog } from "@/lib/types/agents";

interface Props {
  data: AgentCostLog[];
}

export function CostOverviewChart({ data }: Props) {
  const dailyData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const row of data) {
      byDate.set(row.date, (byDate.get(row.date) || 0) + Number(row.cost_usd));
    }
    return Array.from(byDate.entries())
      .map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (dailyData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        אין נתוני עלות לטווח הנבחר
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="date"
            stroke="#64748B"
            fontSize={12}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis
            stroke="#64748B"
            fontSize={12}
            tickFormatter={(v: number) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#161B27",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              color: "#F1F5F9",
              fontSize: 13,
            }}
            formatter={(value) => [`$${Number(value || 0).toFixed(2)}`, "עלות"]}
            labelFormatter={(label) => String(label)}
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#00D4FF"
            strokeWidth={2}
            dot={{ fill: "#00D4FF", r: 3 }}
            activeDot={{ r: 5, fill: "#00D4FF" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
