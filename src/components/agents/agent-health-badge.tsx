import { clsx } from "clsx";
import type { HealthStatus } from "@/lib/types/agents";

const statusConfig: Record<HealthStatus, { bg: string; text: string; label: string }> = {
  healthy: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "תקין" },
  degraded: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "מוגבל" },
  down: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "נפל" },
  unknown: { bg: "bg-gray-100 dark:bg-gray-700", text: "text-gray-500 dark:text-gray-400", label: "לא ידוע" },
};

export function AgentHealthBadge({ status }: { status: HealthStatus }) {
  const config = statusConfig[status] || statusConfig.unknown;
  return (
    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", config.bg, config.text)}>
      {config.label}
    </span>
  );
}
