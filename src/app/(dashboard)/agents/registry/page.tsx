"use client";

import useSWR from "swr";
import { useState } from "react";
import { fetcher } from "@/lib/fetcher";
import { Search, LayoutGrid, List } from "lucide-react";
import { AgentProfileCard } from "@/components/agents/cards/agent-profile-card";
import { NexusBadge } from "@/components/agents/ui/nexus-badge";
import { NexusStatusDot } from "@/components/agents/ui/nexus-status-dot";
import { NexusCardSkeleton } from "@/components/agents/ui/nexus-skeleton";
import type { AgentRecord, HealthStatus, AgentType } from "@/lib/types/agents";
import Link from "next/link";

const typeOrder: AgentType[] = ["team", "agent", "advisor", "bot", "cron", "skill"];

export default function RegistryPage() {
  const { data: agents, isLoading } = useSWR<AgentRecord[]>("/api/agents/registry", fetcher);
  const { data: healthData } = useSWR<Array<{ agent_slug: string; status: HealthStatus }>>("/api/agents/health", fetcher);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AgentType | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const healthMap: Record<string, HealthStatus> = {};
  for (const h of healthData || []) {
    healthMap[h.agent_slug] = h.status;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => <NexusCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const filtered = (agents || []).filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.slug.includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "var(--nexus-text-1)" }}>
          רישום רכיבים
          <span
            className="text-sm font-normal mr-2"
            style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}
          >
            ({filtered.length})
          </span>
        </h1>

        {/* View toggle */}
        <div
          className="flex items-center rounded-lg p-0.5"
          style={{ background: "var(--nexus-bg-card)", border: "1px solid var(--nexus-border)" }}
        >
          <button
            onClick={() => setViewMode("grid")}
            className="p-1.5 rounded-md transition-colors"
            style={{
              background: viewMode === "grid" ? "var(--nexus-accent-glow)" : "transparent",
              color: viewMode === "grid" ? "var(--nexus-accent)" : "var(--nexus-text-3)",
            }}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className="p-1.5 rounded-md transition-colors"
            style={{
              background: viewMode === "table" ? "var(--nexus-accent-glow)" : "transparent",
              color: viewMode === "table" ? "var(--nexus-accent)" : "var(--nexus-text-3)",
            }}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute right-3 top-1/2 -translate-y-1/2"
            size={16}
            style={{ color: "var(--nexus-text-3)" }}
          />
          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            dir="rtl"
            className="w-full pr-9 pl-4 py-2 rounded-xl text-sm outline-none transition-colors"
            style={{
              background: "var(--nexus-bg-card)",
              border: "1px solid var(--nexus-border)",
              color: "var(--nexus-text-1)",
            }}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto nexus-scroll">
          <button
            onClick={() => setTypeFilter("all")}
            className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all shrink-0"
            style={{
              background: typeFilter === "all" ? "var(--nexus-accent-glow)" : "transparent",
              color: typeFilter === "all" ? "var(--nexus-accent)" : "var(--nexus-text-3)",
              border: `1px solid ${typeFilter === "all" ? "rgba(0,212,255,0.3)" : "var(--nexus-border)"}`,
            }}
          >
            הכל
          </button>
          {typeOrder.map((t) => {
            const count = (agents || []).filter((a) => a.type === t).length;
            if (count === 0) return null;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: typeFilter === t ? "rgba(255,255,255,0.06)" : "transparent",
                  border: `1px solid ${typeFilter === t ? "rgba(255,255,255,0.15)" : "var(--nexus-border)"}`,
                }}
              >
                <NexusBadge type={t} />
                <span
                  className="text-[10px]"
                  style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid view */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((agent, i) => (
            <AgentProfileCard
              key={agent.slug}
              agent={agent}
              status={healthMap[agent.slug] || "unknown"}
              index={i}
            />
          ))}
        </div>
      ) : (
        /* Table view */
        <div
          className="nexus-card overflow-hidden"
          style={{ padding: 0 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--nexus-border)" }}>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-2)" }}>שם</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-2)" }}>סוג</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-2)" }}>מודל</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-2)" }}>ערוץ</th>
                  <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-2)" }}>סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr
                    key={agent.slug}
                    className="hover:bg-white/2 transition-colors"
                    style={{ borderBottom: "1px solid var(--nexus-border)" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/agents/registry/${agent.slug}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--nexus-text-1)" }}
                      >
                        {agent.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><NexusBadge type={agent.type as AgentType} /></td>
                    <td className="px-4 py-3" style={{ color: "var(--nexus-text-2)", fontFamily: "var(--nexus-font-mono)" }}>
                      {agent.model || "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--nexus-text-3)" }}>
                      {agent.channel || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <NexusStatusDot status={healthMap[agent.slug] || "unknown"} showLabel />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12" style={{ color: "var(--nexus-text-3)" }}>
          לא נמצאו רכיבים
        </div>
      )}
    </div>
  );
}
