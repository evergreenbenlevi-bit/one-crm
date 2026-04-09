"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { AgentStatsRow } from "@/components/agents/agent-stats-row";
import { AgentHealthBadge } from "@/components/agents/agent-health-badge";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import type { AgentRecord, HealthStatus } from "@/lib/types/agents";

export default function AgentsOverview() {
  const { data: agents, isLoading } = useSWR<AgentRecord[]>("/api/agents/registry", fetcher);
  const { data: healthData } = useSWR<Array<{ agent_slug: string; status: HealthStatus }>>("/api/agents/health", fetcher);
  const [syncing, setSyncing] = useState(false);

  const healthMap: Record<string, string> = {};
  for (const h of healthData || []) {
    healthMap[h.agent_slug] = h.status;
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/agents/sync", { method: "POST" });
      const data = await res.json();
      alert(`סונכרן: ${data.agents_synced} agents, ${data.skills_synced} skills, ${data.crons_synced} crons`);
      window.location.reload();
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  // Group by type for the grid
  const byType = (agents || []).reduce<Record<string, AgentRecord[]>>((acc, a) => {
    (acc[a.type] = acc[a.type] || []).push(a);
    return acc;
  }, {});

  const typeOrder = ["team", "agent", "advisor", "bot", "cron", "skill"];
  const typeNames: Record<string, string> = {
    team: "צוות ראשי", agent: "אייג׳נטים", advisor: "יועצים",
    bot: "בוטים", cron: "קרונים", skill: "סקילים"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">מרכז שליטה</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          סנכרון
        </button>
      </div>

      <AgentStatsRow
        agents={agents || []}
        healthMap={healthMap}
        totalCostToday={0}
      />

      {typeOrder.map((type) => {
        const items = byType[type];
        if (!items?.length) return null;

        return (
          <div key={type}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {typeNames[type]} ({items.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.slice(0, type === "skill" || type === "cron" ? 6 : 20).map((agent) => (
                <a
                  key={agent.slug}
                  href={`/agents/registry/${agent.slug}`}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:border-brand-300 dark:hover:border-brand-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">{agent.name}</span>
                    <AgentHealthBadge status={(healthMap[agent.slug] as HealthStatus) || "unknown"} />
                  </div>
                  {agent.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                      {agent.description.slice(0, 100)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {agent.model && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {agent.model}
                      </span>
                    )}
                    {agent.channel && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        {agent.channel}
                      </span>
                    )}
                  </div>
                </a>
              ))}
              {items.length > (type === "skill" || type === "cron" ? 6 : 20) && (
                <a
                  href="/agents/registry"
                  className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3 text-sm text-gray-500 hover:text-brand-600 transition-colors"
                >
                  +{items.length - (type === "skill" || type === "cron" ? 6 : 20)} נוספים
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
