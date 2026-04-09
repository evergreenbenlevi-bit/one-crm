"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { CronTable } from "@/components/agents/cron-table";
import { Loader2 } from "lucide-react";
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
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-400">שגיאה בטעינת קרונים</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ניהול קרונים</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">LaunchAgents — הפעלה וכיבוי</p>
      </div>
      <CronTable crons={data || []} onToggle={handleToggle} />
    </div>
  );
}
