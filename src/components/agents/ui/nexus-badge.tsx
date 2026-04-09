import { clsx } from "clsx";
import type { AgentType } from "@/lib/types/agents";

const typeLabels: Record<AgentType, string> = {
  team: "צוות",
  agent: "אייג׳נט",
  bot: "בוט",
  skill: "סקיל",
  cron: "קרון",
  advisor: "יועץ",
};

export function NexusBadge({ type }: { type: AgentType }) {
  return (
    <span className={clsx("nexus-badge", `nexus-badge-${type}`)}>
      {typeLabels[type] || type}
    </span>
  );
}
