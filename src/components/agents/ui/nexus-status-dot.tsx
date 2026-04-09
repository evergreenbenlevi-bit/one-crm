"use client";

import { clsx } from "clsx";
import type { HealthStatus } from "@/lib/types/agents";

const dotClass: Record<HealthStatus, string> = {
  healthy: "nexus-dot-ok",
  degraded: "nexus-dot-warn",
  down: "nexus-dot-err",
  unknown: "nexus-dot-idle",
};

const labels: Record<HealthStatus, string> = {
  healthy: "תקין",
  degraded: "מוגבל",
  down: "נפל",
  unknown: "לא ידוע",
};

interface Props {
  status: HealthStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function NexusStatusDot({ status, showLabel = false, size = "sm" }: Props) {
  const s = dotClass[status] || dotClass.unknown;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={clsx("nexus-dot", s, size === "md" && "!w-[10px] !h-[10px]")}
      />
      {showLabel && (
        <span className="text-xs" style={{ color: "var(--nexus-text-2)" }}>
          {labels[status] || labels.unknown}
        </span>
      )}
    </span>
  );
}
