"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Bot, Heart, AlertTriangle, DollarSign, GitBranch } from "lucide-react";
import { NexusMetric } from "@/components/agents/ui/nexus-metric";
import { NexusCardSkeleton } from "@/components/agents/ui/nexus-skeleton";
import { SystemPulse } from "@/components/agents/overview/system-pulse";
import { AgentTree } from "@/components/agents/overview/agent-tree";
import { ActivityFeed } from "@/components/agents/overview/activity-feed";
import type { AgentRecord, HealthStatus } from "@/lib/types/agents";
import Link from "next/link";

export default function AgentsOverview() {
  const { data: agents, isLoading } = useSWR<AgentRecord[]>("/api/agents/registry", fetcher);
  const { data: healthData } = useSWR<Array<{ agent_slug: string; status: HealthStatus }>>("/api/agents/health", fetcher, { refreshInterval: 15000 });
  const [syncing, setSyncing] = useState(false);

  const healthMap: Record<string, string> = {};
  for (const h of healthData || []) {
    healthMap[h.agent_slug] = h.status;
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await fetch("/api/agents/sync", { method: "POST" });
      window.location.reload();
    } finally {
      setSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <NexusCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const total = (agents || []).length;
  const healthy = Object.values(healthMap).filter((s) => s === "healthy").length;
  const degraded = Object.values(healthMap).filter((s) => s === "degraded").length;
  const down = Object.values(healthMap).filter((s) => s === "down").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold"
            style={{ color: "var(--nexus-text-1)" }}
          >
            מרכז שליטה
          </motion.h1>
          <p className="text-sm mt-1" style={{ color: "var(--nexus-text-2)" }}>
            NEXUS — Agent Command Center
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: "var(--nexus-accent-glow)",
            color: "var(--nexus-accent)",
            border: "1px solid rgba(0,212,255,0.2)",
          }}
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          סנכרון
        </button>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <NexusMetric value={total} label="סה״כ רכיבים" icon={<Bot size={20} />} accentColor="#00D4FF" />
        <NexusMetric value={healthy} label="תקינים" icon={<Heart size={20} />} accentColor="#22C55E" />
        <NexusMetric value={down} label="נפלו" icon={<AlertTriangle size={20} />} accentColor="#EF4444" />
        <NexusMetric value="$0.00" label="עלות היום" icon={<DollarSign size={20} />} accentColor="#F59E0B" />
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Agent tree */}
        <div className="lg:col-span-3">
          <AgentTree agents={agents || []} healthMap={healthMap} />
        </div>

        {/* Center: System pulse + mini topology link */}
        <div className="lg:col-span-6 space-y-4">
          {/* System pulse card */}
          <div className="nexus-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold" style={{ color: "var(--nexus-text-2)" }}>
                בריאות מערכת
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  background: down > 0 ? "var(--nexus-err-glow)" : "var(--nexus-ok-glow)",
                  color: down > 0 ? "var(--nexus-err)" : "var(--nexus-ok)",
                  fontFamily: "var(--nexus-font-mono)",
                }}
              >
                {down > 0 ? `${down} DOWN` : "ALL SYSTEMS GO"}
              </span>
            </div>
            <SystemPulse total={total} healthy={healthy} degraded={degraded} down={down} />
          </div>

          {/* Topology preview card */}
          <Link href="/agents/topology">
            <div className="nexus-card p-4 group cursor-pointer hover:nexus-card-glow transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--nexus-accent-glow)" }}
                  >
                    <GitBranch size={20} style={{ color: "var(--nexus-accent)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--nexus-text-1)" }}>
                      טופולוגיית מערכת
                    </p>
                    <p className="text-xs" style={{ color: "var(--nexus-text-3)" }}>
                      <span style={{ fontFamily: "var(--nexus-font-mono)" }}>{total}</span> nodes ·{" "}
                      גרף אינטראקטיבי
                    </p>
                  </div>
                </div>
                <span
                  className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--nexus-accent)" }}
                >
                  פתח →
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right: Activity feed */}
        <div className="lg:col-span-3">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
