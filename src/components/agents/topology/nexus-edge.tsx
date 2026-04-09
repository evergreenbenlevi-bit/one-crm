"use client";

import { memo } from "react";
import { getBezierPath, type EdgeProps } from "@xyflow/react";
import type { EdgeRelation } from "@/lib/types/agents";

const edgeConfig: Record<EdgeRelation, { color: string; dash?: string }> = {
  dispatches: { color: "#00D4FF" },
  uses_skill: { color: "#4ADE80", dash: "6 4" },
  triggers_cron: { color: "#FBBF24", dash: "4 4" },
  monitors: { color: "#C084FC", dash: "8 4" },
  feeds: { color: "#F472B6" },
};

function NexusEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const relation = (data?.relation as EdgeRelation) || "dispatches";
  const config = edgeConfig[relation] || edgeConfig.dispatches;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={config.color}
        strokeWidth={6}
        strokeOpacity={0.08}
        strokeLinecap="round"
      />

      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={config.color}
        strokeWidth={2}
        strokeOpacity={0.6}
        strokeDasharray={config.dash}
        strokeLinecap="round"
      />

      {/* Animated flow particles for dispatches */}
      {relation === "dispatches" && (
        <circle r="3" fill={config.color} opacity={0.8}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

export const NexusEdge = memo(NexusEdgeComponent);
