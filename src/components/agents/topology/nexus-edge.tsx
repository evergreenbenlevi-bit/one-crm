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
  const isToxic = !!(data?.toxic);
  const config = edgeConfig[relation] || edgeConfig.dispatches;
  const strokeColor = isToxic ? "#EF4444" : config.color;
  const glowOpacity = isToxic ? 0.2 : 0.08;
  const strokeOpacity = isToxic ? 0.9 : 0.6;

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
        stroke={strokeColor}
        strokeWidth={isToxic ? 10 : 6}
        strokeOpacity={glowOpacity}
        strokeLinecap="round"
      />

      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isToxic ? 3 : 2}
        strokeOpacity={strokeOpacity}
        strokeDasharray={config.dash}
        strokeLinecap="round"
        className="cursor-pointer"
      />

      {/* Animated flow particles */}
      {(relation === "dispatches" || isToxic) && (
        <circle r={isToxic ? 4 : 3} fill={strokeColor} opacity={0.8}>
          <animateMotion dur={isToxic ? "1s" : "2s"} repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

export const NexusEdge = memo(NexusEdgeComponent);
