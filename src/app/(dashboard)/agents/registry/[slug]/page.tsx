"use client";

import { use } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { NexusStatusDot } from "@/components/agents/ui/nexus-status-dot";
import { NexusBadge } from "@/components/agents/ui/nexus-badge";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import type { AgentRecord, AgentHealthEvent, AgentType, HealthStatus } from "@/lib/types/agents";

const typeAccent: Record<AgentType, string> = {
  team: "#C084FC", agent: "#00D4FF", bot: "#4ADE80",
  skill: "#94A3B8", cron: "#FBBF24", advisor: "#F472B6",
};

export default function AgentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: agent } = useSWR<AgentRecord>(`/api/agents/registry/${slug}`, fetcher);
  const { data: healthHistory } = useSWR<AgentHealthEvent[]>(`/api/agents/health/${slug}?limit=20`, fetcher);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--nexus-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const accent = typeAccent[agent.type as AgentType] || typeAccent.agent;
  const currentStatus = (healthHistory?.[0]?.status as HealthStatus) || "unknown";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-3xl"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--nexus-text-3)" }}>
        <Link href="/agents/registry" style={{ color: "var(--nexus-accent)" }} className="hover:underline">
          רישום
        </Link>
        <ArrowRight size={14} className="rtl:rotate-180" />
        <span style={{ color: "var(--nexus-text-1)" }}>{agent.name}</span>
      </div>

      {/* Main card */}
      <div className="nexus-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Large avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${accent}15` }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: accent, fontFamily: "var(--nexus-font-mono)" }}
              >
                {agent.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--nexus-text-1)" }}>{agent.name}</h1>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}
              >
                {agent.slug}
              </p>
            </div>
          </div>
          <NexusStatusDot status={currentStatus} showLabel size="md" />
        </div>

        {agent.description && (
          <p className="text-sm mb-4" style={{ color: "var(--nexus-text-2)" }}>{agent.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <InfoField label="סוג" value={<NexusBadge type={agent.type as AgentType} />} />
          <InfoField
            label="מודל"
            value={
              <span style={{ fontFamily: "var(--nexus-font-mono)", color: "var(--nexus-text-1)" }}>
                {agent.model || "—"}
              </span>
            }
          />
          <InfoField label="ערוץ" value={agent.channel || "—"} />
          <InfoField
            label="אב"
            value={
              agent.parent_slug ? (
                <Link href={`/agents/registry/${agent.parent_slug}`} style={{ color: "var(--nexus-accent)" }} className="hover:underline">
                  {agent.parent_slug}
                </Link>
              ) : "—"
            }
          />
          <div className="col-span-2">
            <InfoField
              label="קובץ"
              value={
                <span style={{ fontFamily: "var(--nexus-font-mono)", fontSize: "11px", color: "var(--nexus-text-3)" }}>
                  {agent.file_path || "—"}
                </span>
              }
            />
          </div>
        </div>
      </div>

      {/* Health history */}
      {healthHistory && healthHistory.length > 0 && (
        <div className="nexus-card p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: "var(--nexus-text-1)" }}>
            היסטוריית בריאות
          </h2>

          {/* Timeline */}
          <div className="flex gap-1 mb-4 overflow-x-auto nexus-scroll pb-2">
            {healthHistory.map((h) => (
              <div
                key={h.id}
                className="w-2 h-8 rounded-sm shrink-0 transition-all hover:h-10"
                style={{
                  background:
                    h.status === "healthy" ? "var(--nexus-ok)" :
                    h.status === "degraded" ? "var(--nexus-warn)" :
                    h.status === "down" ? "var(--nexus-err)" : "var(--nexus-idle)",
                  opacity: 0.7,
                }}
                title={`${h.status} — ${new Date(h.checked_at).toLocaleString("he-IL")}`}
              />
            ))}
          </div>

          {/* List */}
          <div className="space-y-1">
            {healthHistory.slice(0, 10).map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: "var(--nexus-border)" }}
              >
                <div className="flex items-center gap-2">
                  <NexusStatusDot status={h.status} showLabel />
                  {h.message && (
                    <span className="text-xs" style={{ color: "var(--nexus-text-3)" }}>
                      {h.message}
                    </span>
                  )}
                </div>
                <span
                  className="text-[10px]"
                  style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}
                >
                  {new Date(h.checked_at).toLocaleString("he-IL")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: "var(--nexus-text-3)" }}>{label}</p>
      <div style={{ color: "var(--nexus-text-1)" }}>{value}</div>
    </div>
  );
}
