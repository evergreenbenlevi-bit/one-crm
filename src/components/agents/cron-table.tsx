"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Play, Square, Search, Loader2 } from "lucide-react";
import type { CronInfo } from "@/lib/types/agents";

interface Props {
  crons: CronInfo[];
  onToggle: (label: string, action: "load" | "unload") => Promise<void>;
}

export function CronTable({ crons, onToggle }: Props) {
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const filtered = crons.filter((c) =>
    !search || c.label.toLowerCase().includes(search.toLowerCase()) ||
    (c.script_path || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (label: string, isLoaded: boolean) => {
    setToggling(label);
    try {
      await onToggle(label, isLoaded ? "unload" : "load");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="חיפוש קרון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-9 pl-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="text-right px-4 py-3 font-medium">Label</th>
                <th className="text-right px-4 py-3 font-medium">תזמון</th>
                <th className="text-right px-4 py-3 font-medium">סקריפט</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cron) => (
                <tr
                  key={cron.label}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-900 dark:text-white">
                    {cron.label}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    {cron.schedule || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={cron.script_path}>
                    {cron.script_path ? cron.script_path.split("/").pop() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        cron.is_loaded
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                      )}
                    >
                      {cron.is_loaded ? "פעיל" : "כבוי"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(cron.label, cron.is_loaded)}
                      disabled={toggling === cron.label}
                      className={clsx(
                        "p-1.5 rounded-lg transition-colors",
                        cron.is_loaded
                          ? "hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                          : "hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500"
                      )}
                      title={cron.is_loaded ? "כבה" : "הפעל"}
                    >
                      {toggling === cron.label ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : cron.is_loaded ? (
                        <Square size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    לא נמצאו קרונים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-400">סה״כ: {crons.length} קרונים | {crons.filter((c) => c.is_loaded).length} פעילים</p>
    </div>
  );
}
