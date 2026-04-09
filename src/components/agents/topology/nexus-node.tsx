"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { clsx } from "clsx";
import type { AgentType, HealthStatus } from "@/lib/types/agents";

const statusRing: Record<HealthStatus, string> = {
  healthy: "ring-[#22C55E]/60 shadow-[0_0_12px_rgba(34,197,94,0.3)]",
  degraded: "ring-[#F59E0B]/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  down: "ring-[#EF4444]/60 shadow-[0_0_12px_rgba(239,68,68,0.3)]",
  unknown: "ring-[#4B5563]/40",
};

const typeAccent: Record<AgentType, string> = {
  team: "#C084FC",
  agent: "#00D4FF",
  bot: "#4ADE80",
  skill: "#94A3B8",
  cron: "#FBBF24",
  advisor: "#F472B6",
};

interface NexusNodeData {
  label: string;
  agentType: AgentType;
  model?: string;
  status: HealthStatus;
  costToday?: number;
  slug: string;
  parentSlug?: string;
}

function NexusNodeComponent({ data, selected }: { data: NexusNodeData; selected?: boolean }) {
  const agentType = data.agentType || "agent";
  const accent = typeAccent[agentType] || typeAccent.agent;
  const isTeam = agentType === "team";

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !border-0"
        style={{ background: accent }}
      />

      <div
        className={clsx(
          "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
          selected && "!border-[var(--nexus-accent)] nexus-card-glow",
          isTeam ? "min-w-[200px]" : "min-w-[160px]"
        )}
        style={{
          background: "var(--nexus-bg-card)",
          borderColor: selected ? "var(--nexus-accent)" : "var(--nexus-border)",
        }}
      >
        {/* Avatar circle with status ring */}
        <div
          className={clsx(
            "relative flex items-center justify-center rounded-full ring-2 shrink-0",
            isTeam ? "w-10 h-10" : "w-8 h-8",
            statusRing[data.status] || statusRing.unknown
          )}
          style={{ background: `${accent}20` }}
        >
          <span
            className="text-xs font-bold"
            style={{ color: accent, fontFamily: "var(--nexus-font-mono)" }}
          >
            {data.label.slice(0, 2).toUpperCase()}
          </span>

          {/* Live pulse for active */}
          {data.status === "healthy" && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-[var(--nexus-bg-card)]">
              <span className="absolute inset-0 rounded-full bg-[#22C55E] animate-ping opacity-40" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "var(--nexus-text-1)" }}
          >
            {data.label}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="nexus-badge"
              style={{
                background: `${accent}20`,
                color: accent,
              }}
            >
              {agentType}
            </span>
            {data.model && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--nexus-text-2)",
                  fontFamily: "var(--nexus-font-mono)",
                }}
              >
                {data.model}
              </span>
            )}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !border-0"
        style={{ background: accent }}
      />
    </>
  );
}

export const NexusNode = memo(NexusNodeComponent);
