"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { AgentRegistryTable } from "@/components/agents/agent-registry-table";
import type { AgentRecord, HealthStatus } from "@/lib/types/agents";

export default function RegistryPage() {
  const { data: agents, isLoading } = useSWR<AgentRecord[]>("/api/agents/registry", fetcher);
  const { data: healthData } = useSWR<Array<{ agent_slug: string; status: HealthStatus }>>("/api/agents/health", fetcher);

  const healthMap: Record<string, HealthStatus> = {};
  for (const h of healthData || []) {
    healthMap[h.agent_slug] = h.status;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">רישום רכיבים</h1>
      <AgentRegistryTable agents={agents || []} healthMap={healthMap} />
    </div>
  );
}
