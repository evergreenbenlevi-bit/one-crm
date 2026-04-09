"use client";

import { Bot, Heart, AlertTriangle, DollarSign } from "lucide-react";
import type { AgentRecord } from "@/lib/types/agents";

interface StatsRowProps {
  agents: AgentRecord[];
  healthMap: Record<string, string>;
  totalCostToday: number;
}

export function AgentStatsRow({ agents, healthMap, totalCostToday }: StatsRowProps) {
  const total = agents.length;
  const healthy = Object.values(healthMap).filter((s) => s === "healthy").length;
  const down = Object.values(healthMap).filter((s) => s === "down").length;

  const stats = [
    { label: "סה״כ רכיבים", value: total, icon: Bot, color: "text-brand-600 dark:text-brand-400" },
    { label: "תקינים", value: healthy, icon: Heart, color: "text-green-600 dark:text-green-400" },
    { label: "נפלו", value: down, icon: AlertTriangle, color: "text-red-600 dark:text-red-400" },
    { label: "עלות היום", value: `$${totalCostToday.toFixed(2)}`, icon: DollarSign, color: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gray-50 dark:bg-gray-700 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
