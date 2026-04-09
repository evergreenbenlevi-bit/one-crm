"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useCallback } from "react";
import { NexusStatusDot } from "../ui/nexus-status-dot";
import { useAgentRealtime } from "@/hooks/use-agent-realtime";
import type { AgentHealthEvent, HealthStatus } from "@/lib/types/agents";

export function ActivityFeed() {
  const { data: logs, mutate } = useSWR<AgentHealthEvent[]>(
    "/api/agents/logs?limit=30",
    fetcher,
    { refreshInterval: 60000 }
  );

  // Realtime: instant updates when new health events arrive
  const onNewEvent = useCallback(() => { mutate(); }, [mutate]);
  useAgentRealtime({ table: "agent_health_events", onInsert: onNewEvent });

  return (
    <div className="nexus-card p-0 overflow-hidden" style={{ maxHeight: "calc(100vh - 340px)" }}>
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: "var(--nexus-border)" }}>
        <p className="text-xs font-bold tracking-wider" style={{ color: "var(--nexus-text-2)" }}>
          פעילות אחרונה
        </p>
        <span
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
          style={{ background: "var(--nexus-ok-glow)", color: "var(--nexus-ok)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          חי
        </span>
      </div>

      <div className="nexus-scroll overflow-y-auto" style={{ maxHeight: "calc(100vh - 400px)" }}>
        {(logs || []).map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 px-3 py-2 border-b hover:bg-white/2 transition-colors"
            style={{ borderColor: "var(--nexus-border)" }}
          >
            <NexusStatusDot status={log.status as HealthStatus} />
            <div className="min-w-0 flex-1">
              <p className="text-xs truncate" style={{ color: "var(--nexus-text-1)" }}>
                {log.agent_slug}
              </p>
              {log.message && (
                <p className="text-[10px] truncate" style={{ color: "var(--nexus-text-3)" }}>
                  {log.message}
                </p>
              )}
            </div>
            <span
              className="text-[10px] shrink-0"
              style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}
            >
              {formatTime(log.checked_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
