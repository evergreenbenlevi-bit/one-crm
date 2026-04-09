"use client";

import { X, ArrowLeft, Clock, Zap, AlertTriangle } from "lucide-react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { AgentRun, EdgeRelation } from "@/lib/types/agents";

interface TracePanelProps {
  edge: { source: string; target: string; relation: EdgeRelation } | null;
  onClose: () => void;
}

export function TracePanel({ edge, onClose }: TracePanelProps) {
  // Fetch recent runs for both source and target agents
  const { data: sourceRuns } = useSWR<AgentRun[]>(
    edge ? `/api/agents/runs?slug=${edge.source}&limit=10` : null,
    fetcher
  );
  const { data: targetRuns } = useSWR<AgentRun[]>(
    edge ? `/api/agents/runs?slug=${edge.target}&limit=10` : null,
    fetcher
  );

  if (!edge) return null;

  const allRuns = [...(sourceRuns || []), ...(targetRuns || [])].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  const relationLabels: Record<EdgeRelation, string> = {
    dispatches: "מפעיל",
    uses_skill: "משתמש ב-skill",
    triggers_cron: "מפעיל cron",
    monitors: "מנטר",
    feeds: "מזין",
  };

  return (
    <div
      className="absolute top-0 left-0 z-30 h-full w-80 overflow-hidden"
      style={{
        background: "rgba(13, 15, 20, 0.95)",
        borderRight: "1px solid var(--nexus-border)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "var(--nexus-border)" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold" style={{ color: "var(--nexus-text-1)" }}>
            מעקב חיבור
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={16} style={{ color: "var(--nexus-text-3)" }} />
          </button>
        </div>

        {/* Edge info */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--nexus-accent-glow)" }}
        >
          <span className="text-xs font-mono" style={{ color: "var(--nexus-accent)" }}>
            {edge.source}
          </span>
          <ArrowLeft size={12} style={{ color: "var(--nexus-text-3)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--nexus-accent)" }}>
            {edge.target}
          </span>
        </div>
        <p className="text-[10px] mt-2" style={{ color: "var(--nexus-text-3)" }}>
          {relationLabels[edge.relation]} · {allRuns.length} ריצות אחרונות
        </p>
      </div>

      {/* Trace timeline */}
      <div className="overflow-y-auto nexus-scroll" style={{ maxHeight: "calc(100% - 140px)" }}>
        {allRuns.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs" style={{ color: "var(--nexus-text-3)" }}>
              אין ריצות מתועדות עדיין
            </p>
          </div>
        ) : (
          allRuns.map((run) => (
            <div
              key={run.id}
              className="px-4 py-3 border-b hover:bg-white/2 transition-colors"
              style={{ borderColor: "var(--nexus-border)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {run.status === "error" ? (
                    <AlertTriangle size={12} style={{ color: "var(--nexus-err)" }} />
                  ) : (
                    <Zap size={12} style={{ color: "var(--nexus-ok)" }} />
                  )}
                  <span
                    className="text-xs font-mono"
                    style={{ color: run.status === "error" ? "var(--nexus-err)" : "var(--nexus-text-1)" }}
                  >
                    {run.agent_slug}
                  </span>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: run.status === "error" ? "var(--nexus-err-glow)" : run.status === "running" ? "var(--nexus-accent-glow)" : "var(--nexus-ok-glow)",
                    color: run.status === "error" ? "var(--nexus-err)" : run.status === "running" ? "var(--nexus-accent)" : "var(--nexus-ok)",
                    fontFamily: "var(--nexus-font-mono)",
                  }}
                >
                  {run.status}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                {run.duration_ms && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--nexus-text-3)" }}>
                    <Clock size={10} />
                    {run.duration_ms > 1000 ? `${(run.duration_ms / 1000).toFixed(1)}s` : `${run.duration_ms}ms`}
                  </span>
                )}
                {(run.input_tokens > 0 || run.output_tokens > 0) && (
                  <span className="text-[10px] font-mono" style={{ color: "var(--nexus-text-3)" }}>
                    {run.input_tokens + run.output_tokens} tokens
                  </span>
                )}
                {run.cost_usd > 0 && (
                  <span className="text-[10px] font-mono" style={{ color: "var(--nexus-text-3)" }}>
                    ${Number(run.cost_usd).toFixed(4)}
                  </span>
                )}
              </div>

              <span className="text-[10px]" style={{ color: "var(--nexus-text-3)", fontFamily: "var(--nexus-font-mono)" }}>
                {formatTime(run.started_at)}
              </span>

              {run.error_message && (
                <p className="text-[10px] mt-1 truncate" style={{ color: "var(--nexus-err)" }}>
                  {run.error_message}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("he-IL", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
