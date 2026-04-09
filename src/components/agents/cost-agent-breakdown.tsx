"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
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

export function CostAgentBreakdown({ data }: Props) {
  const agentData = useMemo(() => {
    const byAgent = new Map<string, { cost: number; tokens: number; sessions: number }>();
    for (const row of data) {
      const prev = byAgent.get(row.agent_slug) || { cost: 0, tokens: 0, sessions: 0 };
      byAgent.set(row.agent_slug, {
        cost: prev.cost + Number(row.cost_usd),
        tokens: prev.tokens + Number(row.input_tokens) + Number(row.output_tokens),
        sessions: prev.sessions + Number(row.session_count),
      });
    }
    return Array.from(byAgent.entries())
      .map(([slug, v]) => ({
        slug,
        cost: Math.round(v.cost * 100) / 100,
        tokens: v.tokens,
        sessions: v.sessions,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }, [data]);

  if (agentData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        אין נתונים
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={agentData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748B"
            fontSize={12}
            tickFormatter={(v: number) => `$${v}`}
          />
          <YAxis
            type="category"
            dataKey="slug"
            stroke="#64748B"
            fontSize={11}
            width={75}
            tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "..." : v}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#161B27",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12,
              color: "#fff",
              fontSize: 13,
            }}
            formatter={(value) => {
              const v = Number(value || 0);
              return [`$${v.toFixed(2)}`, "עלות"];
            }}
          />
          <Bar dataKey="cost" fill="#00D4FF" radius={[0, 6, 6, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
