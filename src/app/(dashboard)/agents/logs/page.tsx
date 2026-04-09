"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { LogsViewer } from "@/components/agents/logs-viewer";

export default function LogsPage() {
  const { data, isLoading, error } = useSWR("/api/agents/logs?limit=200", fetcher, {
    refreshInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--nexus-accent)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p style={{ color: "var(--nexus-err)" }}>שגיאה בטעינת לוגים</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--nexus-text-1)" }}>לוגים</h2>
        <p className="text-sm" style={{ color: "var(--nexus-text-3)" }}>אירועי בריאות אחרונים</p>
      </div>
      <LogsViewer logs={data || []} />
    </div>
  );
}
