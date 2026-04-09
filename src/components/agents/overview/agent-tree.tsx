"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { NexusStatusDot } from "../ui/nexus-status-dot";
import { NexusBadge } from "../ui/nexus-badge";
import type { AgentRecord, AgentType, HealthStatus } from "@/lib/types/agents";

interface Props {
  agents: AgentRecord[];
  healthMap: Record<string, string>;
}

const typeOrder: AgentType[] = ["team", "agent", "advisor", "bot", "cron", "skill"];
const typeNames: Record<string, string> = {
  team: "צוות ראשי", agent: "אייג׳נטים", advisor: "יועצים",
  bot: "בוטים", cron: "קרונים", skill: "סקילים",
};

export function AgentTree({ agents, healthMap }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["skill", "cron"]));

  const byType = agents.reduce<Record<string, AgentRecord[]>>((acc, a) => {
    (acc[a.type] = acc[a.type] || []).push(a);
    return acc;
  }, {});

  const toggle = (type: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="nexus-card p-0 overflow-hidden nexus-scroll" style={{ maxHeight: "calc(100vh - 340px)", overflowY: "auto" }}>
      <div className="p-3 border-b" style={{ borderColor: "var(--nexus-border)" }}>
        <p className="text-xs font-bold tracking-wider" style={{ color: "var(--nexus-text-2)" }}>
          רכיבי מערכת
        </p>
      </div>

      {typeOrder.map((type) => {
        const items = byType[type];
        if (!items?.length) return null;
        const isOpen = !collapsed.has(type);
        const healthyCount = items.filter((a) => healthMap[a.slug] === "healthy").length;

        return (
          <div key={type}>
            <button
              onClick={() => toggle(type)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/3 transition-colors"
            >
              {isOpen ? (
                <ChevronDown size={14} style={{ color: "var(--nexus-text-3)" }} />
              ) : (
                <ChevronLeft size={14} style={{ color: "var(--nexus-text-3)" }} />
              )}
              <NexusBadge type={type} />
              <span className="text-xs mr-auto" style={{ color: "var(--nexus-text-2)" }}>
                {typeNames[type]}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  fontFamily: "var(--nexus-font-mono)",
                  background: "rgba(255,255,255,0.04)",
                  color: "var(--nexus-text-3)",
                }}
              >
                {healthyCount}/{items.length}
              </span>
            </button>

            {isOpen && (
              <div className="px-2 pb-2">
                {items.slice(0, 15).map((agent) => (
                  <a
                    key={agent.slug}
                    href={`/agents/registry/${agent.slug}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/3 transition-colors group"
                  >
                    <NexusStatusDot status={(healthMap[agent.slug] as HealthStatus) || "unknown"} />
                    <span
                      className="text-xs truncate flex-1 group-hover:text-white transition-colors"
                      style={{ color: "var(--nexus-text-2)" }}
                    >
                      {agent.name}
                    </span>
                    {agent.model && (
                      <span
                        className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}
                      >
                        {agent.model}
                      </span>
                    )}
                  </a>
                ))}
                {items.length > 15 && (
                  <a
                    href="/agents/registry"
                    className="block text-center text-[10px] py-1"
                    style={{ color: "var(--nexus-accent)" }}
                  >
                    +{items.length - 15} נוספים
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
