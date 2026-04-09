"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { LogsViewer } from "@/components/agents/logs-viewer";
import { Loader2 } from "lucide-react";

export default function LogsPage() {
  const { data, isLoading, error } = useSWR("/api/agents/logs?limit=200", fetcher, {
    refreshInterval: 15000,
  });

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
        <p className="text-red-400">שגיאה בטעינת לוגים</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">לוגים</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">אירועי בריאות אחרונים</p>
      </div>
      <LogsViewer logs={data || []} />
    </div>
  );
}
