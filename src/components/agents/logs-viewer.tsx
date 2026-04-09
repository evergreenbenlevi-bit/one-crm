"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Search, Filter } from "lucide-react";
import type { HealthStatus } from "@/lib/types/agents";

interface LogEntry {
  id: string;
  agent_slug: string;
  status: HealthStatus;
  message: string | null;
  checked_at: string;
}

const statusColors: Record<HealthStatus, string> = {
  healthy: "text-green-500",
  degraded: "text-amber-500",
  down: "text-red-500",
  unknown: "text-gray-500",
};

const statusLabels: Record<HealthStatus, string> = {
  healthy: "תקין",
  degraded: "מוגבל",
  down: "נפל",
  unknown: "לא ידוע",
};

interface Props {
  logs: LogEntry[];
}

export function LogsViewer({ logs }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HealthStatus | "all">("all");

  const filtered = logs.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search && !l.agent_slug.toLowerCase().includes(search.toLowerCase()) && !(l.message || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="חיפוש לוג..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as HealthStatus | "all")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2"
          >
            <option value="all">כל הסטטוסים</option>
            <option value="healthy">תקין</option>
            <option value="degraded">מוגבל</option>
            <option value="down">נפל</option>
            <option value="unknown">לא ידוע</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="text-right px-4 py-3 font-medium">זמן</th>
                <th className="text-right px-4 py-3 font-medium">אייג׳נט</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium">הודעה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(log.checked_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {log.agent_slug}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("font-medium text-xs", statusColors[log.status] || statusColors.unknown)}>
                      {statusLabels[log.status] || log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-md truncate">
                    {log.message || "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    אין לוגים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">מציג {filtered.length} מתוך {logs.length} שורות</p>
    </div>
  );
}
