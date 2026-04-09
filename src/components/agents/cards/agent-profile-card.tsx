"use client";

import { motion } from "framer-motion";
import { NexusStatusDot } from "../ui/nexus-status-dot";
import { NexusBadge } from "../ui/nexus-badge";
import type { AgentRecord, AgentType, HealthStatus } from "@/lib/types/agents";

const typeAccent: Record<AgentType, string> = {
  team: "#C084FC",
  agent: "#00D4FF",
  bot: "#4ADE80",
  skill: "#94A3B8",
  cron: "#FBBF24",
  advisor: "#F472B6",
};

interface Props {
  agent: AgentRecord;
  status: HealthStatus;
  index?: number;
}

export function AgentProfileCard({ agent, status, index = 0 }: Props) {
  const accent = typeAccent[agent.type as AgentType] || typeAccent.agent;

  return (
    <motion.a
      href={`/agents/registry/${agent.slug}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.02 }}
      className="nexus-card p-4 block group cursor-pointer"
      style={{
        ["--card-accent" as string]: accent,
      }}
    >
      {/* Top row: avatar + name + status */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${accent}15`,
            boxShadow: `inset 0 0 0 1px ${accent}30`,
          }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: accent, fontFamily: "var(--nexus-font-mono)" }}
          >
            {agent.name.slice(0, 2).toUpperCase()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold truncate group-hover:text-white transition-colors"
            style={{ color: "var(--nexus-text-1)" }}
          >
            {agent.name}
          </p>
          {agent.description && (
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--nexus-text-3)" }}
            >
              {agent.description.slice(0, 60)}
            </p>
          )}
        </div>

        <NexusStatusDot status={status} />
      </div>

      {/* Bottom row: badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <NexusBadge type={agent.type as AgentType} />
        {agent.model && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--nexus-text-2)",
              fontFamily: "var(--nexus-font-mono)",
            }}
          >
            {agent.model}
          </span>
        )}
        {agent.channel && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--nexus-text-3)",
            }}
          >
            {agent.channel}
          </span>
        )}
      </div>
    </motion.a>
  );
}
