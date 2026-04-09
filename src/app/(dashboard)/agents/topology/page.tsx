"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { NexusTopology } from "@/components/agents/topology/nexus-topology";
import { NexusSkeleton } from "@/components/agents/ui";
import type { TopologyData } from "@/lib/types/agents";

export default function TopologyPage() {
  const { data, isLoading, error } = useSWR<TopologyData>("/api/agents/topology", fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <NexusSkeleton className="h-6 w-48" />
        <div
          className="w-full h-[calc(100vh-180px)] rounded-2xl flex items-center justify-center"
          style={{ background: "var(--nexus-bg-card)", border: "1px solid var(--nexus-border)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nexus-accent)", borderTopColor: "transparent" }} />
            <p style={{ color: "var(--nexus-text-2)" }} className="text-sm">טוען טופולוגיה...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="flex items-center justify-center h-[calc(100vh-180px)] rounded-2xl"
        style={{ background: "var(--nexus-bg-card)", border: "1px solid var(--nexus-border)" }}
      >
        <p style={{ color: "var(--nexus-err)" }}>שגיאה בטעינת טופולוגיה</p>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-[calc(100vh-180px)] rounded-2xl"
        style={{ background: "var(--nexus-bg-card)", border: "1px solid var(--nexus-border)" }}
      >
        <p style={{ color: "var(--nexus-text-2)" }}>אין נתונים להצגה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--nexus-text-1)" }}>
            טופולוגיית מערכת
          </h2>
          <p className="text-sm" style={{ color: "var(--nexus-text-2)" }}>
            <span style={{ fontFamily: "var(--nexus-font-mono)" }}>{data.nodes.length}</span> רכיבים
            {" · "}
            <span style={{ fontFamily: "var(--nexus-font-mono)" }}>{data.edges.length}</span> חיבורים
          </p>
        </div>
      </div>
      <NexusTopology data={data} />
    </div>
  );
}
