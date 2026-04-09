"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { clsx } from "clsx";
import type { AgentType, HealthStatus } from "@/lib/types/agents";

const typeLabels: Record<AgentType, string> = {
  team: "צוות",
  agent: "אייג׳נט",
  bot: "בוט",
  skill: "סקיל",
  cron: "קרון",
  advisor: "יועץ",
};

const typeBg: Record<AgentType, string> = {
  team: "border-purple-500/50 bg-purple-950/40",
  agent: "border-blue-500/50 bg-blue-950/40",
  bot: "border-green-500/50 bg-green-950/40",
  skill: "border-gray-500/50 bg-gray-800/40",
  cron: "border-amber-500/50 bg-amber-950/40",
  advisor: "border-pink-500/50 bg-pink-950/40",
};

const typeBadgeColor: Record<AgentType, string> = {
  team: "bg-purple-900/60 text-purple-300",
  agent: "bg-blue-900/60 text-blue-300",
  bot: "bg-green-900/60 text-green-300",
  skill: "bg-gray-700/60 text-gray-300",
  cron: "bg-amber-900/60 text-amber-300",
  advisor: "bg-pink-900/60 text-pink-300",
};

const statusDot: Record<HealthStatus, string> = {
  healthy: "bg-green-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
  unknown: "bg-gray-500",
};

const sizeMap: Record<string, string> = {
  team: "min-w-[180px] px-4 py-3",
  agent: "min-w-[150px] px-3 py-2.5",
  default: "min-w-[120px] px-3 py-2",
};

interface TopologyNodeData {
  label: string;
  agentType: AgentType;
  model?: string;
  status: HealthStatus;
  costToday?: number;
  slug: string;
}

function TopologyNodeComponent({ data }: { data: TopologyNodeData }) {
  const agentType = data.agentType || "agent";
  const sizeClass = sizeMap[agentType] || sizeMap.default;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-2 !h-2" />
      <div
        className={clsx(
          "rounded-xl border-2 shadow-lg cursor-pointer transition-all hover:scale-105 hover:shadow-xl",
          typeBg[agentType] || typeBg.agent,
          sizeClass
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={clsx("w-2.5 h-2.5 rounded-full shrink-0", statusDot[data.status] || statusDot.unknown)} />
          <span className="text-sm font-semibold text-white truncate">{data.label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={clsx("px-1.5 py-0.5 rounded text-[10px] font-medium", typeBadgeColor[agentType])}>
            {typeLabels[agentType]}
          </span>
          {data.model && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700/60 text-gray-300">
              {data.model}
            </span>
          )}
          {data.costToday !== undefined && data.costToday > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700/60 text-emerald-300">
              ${data.costToday.toFixed(2)}
            </span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-2 !h-2" />
    </>
  );
}

export const TopologyNode = memo(TopologyNodeComponent);
