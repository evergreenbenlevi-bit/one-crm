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
  const volume = (data?.volume as number) || 0;
  const config = edgeConfig[relation] || edgeConfig.dispatches;
  const strokeColor = isToxic ? "#EF4444" : config.color;
  const glowOpacity = isToxic ? 0.2 : 0.08;
  const strokeOpacity = isToxic ? 0.9 : 0.6;
  // Scale stroke width by volume: 1.5 base, up to 4 for high-volume edges
  const baseWidth = isToxic ? 3 : Math.min(1.5 + volume * 0.05, 4);
  const glowWidth = isToxic ? 10 : Math.min(4 + volume * 0.1, 12);

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
        strokeWidth={glowWidth}
        strokeOpacity={glowOpacity}
        strokeLinecap="round"
      />

      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={baseWidth}
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
