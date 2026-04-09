"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { CronTable } from "@/components/agents/cron-table";
import type { CronInfo } from "@/lib/types/agents";

export default function CronsPage() {
  const { data, isLoading, error, mutate } = useSWR<CronInfo[]>("/api/agents/crons", fetcher, {
    refreshInterval: 30000,
  });

  const handleToggle = async (label: string, action: "load" | "unload") => {
    await fetch(`/api/agents/crons/${label}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    mutate();
  };

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
        <p style={{ color: "var(--nexus-err)" }}>שגיאה בטעינת קרונים</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--nexus-text-1)" }}>ניהול קרונים</h2>
        <p className="text-sm" style={{ color: "var(--nexus-text-3)" }}>LaunchAgents — הפעלה וכיבוי</p>
      </div>
      <CronTable crons={data || []} onToggle={handleToggle} />
    </div>
  );
}
