"use client";

import { use } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { AgentHealthBadge } from "@/components/agents/agent-health-badge";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { AgentRecord, AgentHealthEvent, HealthStatus } from "@/lib/types/agents";

export default function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: agent } = useSWR<AgentRecord>(`/api/agents/registry/${slug}`, fetcher);
  const { data: healthHistory } = useSWR<AgentHealthEvent[]>(`/api/agents/health/${slug}?limit=20`, fetcher);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/agents/registry" className="hover:text-brand-600">רישום</Link>
        <ArrowRight size={14} className="rtl:rotate-180" />
        <span className="text-gray-900 dark:text-white">{agent.name}</span>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{agent.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{agent.slug}</p>
          </div>
          <AgentHealthBadge status={(healthHistory?.[0]?.status as HealthStatus) || "unknown"} />
        </div>

        {agent.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{agent.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">סוג</span>
            <p className="font-medium text-gray-900 dark:text-white">{agent.type}</p>
          </div>
          <div>
            <span className="text-gray-400">מודל</span>
            <p className="font-medium text-gray-900 dark:text-white">{agent.model || "—"}</p>
          </div>
          <div>
            <span className="text-gray-400">ערוץ</span>
            <p className="font-medium text-gray-900 dark:text-white">{agent.channel || "—"}</p>
          </div>
          <div>
            <span className="text-gray-400">אב</span>
            <p className="font-medium text-gray-900 dark:text-white">
              {agent.parent_slug ? (
                <Link href={`/agents/registry/${agent.parent_slug}`} className="text-brand-600 hover:underline">
                  {agent.parent_slug}
                </Link>
              ) : "—"}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-gray-400">קובץ</span>
            <p className="font-mono text-xs text-gray-600 dark:text-gray-400 truncate">{agent.file_path || "—"}</p>
          </div>
        </div>
      </div>

      {healthHistory && healthHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">היסטוריית בריאות</h2>
          <div className="space-y-2">
            {healthHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <AgentHealthBadge status={h.status} />
                  {h.message && <span className="text-gray-500">{h.message}</span>}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(h.checked_at).toLocaleString("he-IL")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
