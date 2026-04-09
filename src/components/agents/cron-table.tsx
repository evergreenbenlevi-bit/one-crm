"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { CronInfo } from "@/lib/types/agents";

interface Props {
  crons: CronInfo[];
  onToggle: (label: string, action: "load" | "unload") => Promise<void>;
}

export function CronTable({ crons, onToggle }: Props) {
  const [search, setSearch] = useState("");

  const filtered = crons.filter((c) =>
    !search || c.label.toLowerCase().includes(search.toLowerCase()) ||
    (c.script_path || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2" size={16} style={{ color: "var(--nexus-text-3)" }} />
        <input
          type="text"
          placeholder="חיפוש קרון..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pr-9 pl-4 py-2 rounded-xl text-sm outline-none"
          style={{
            background: "var(--nexus-bg-elevated)",
            border: "1px solid var(--nexus-border)",
            color: "var(--nexus-text-1)",
          }}
        />
      </div>

      <div className="nexus-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--nexus-border)" }}>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-3)" }}>Label</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-3)" }}>תזמון</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-3)" }}>סקריפט</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: "var(--nexus-text-3)" }}>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cron) => (
                <tr
                  key={cron.label}
                  style={{ borderBottom: "1px solid var(--nexus-border)" }}
                >
                  <td className="px-4 py-3 text-xs" style={{ fontFamily: "var(--nexus-font-mono)", color: "var(--nexus-text-1)" }}>
                    {cron.label}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ fontFamily: "var(--nexus-font-mono)", color: "var(--nexus-text-2)" }}>
                    {cron.schedule || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "var(--nexus-text-3)" }} title={cron.script_path}>
                    {cron.script_path ? cron.script_path.split("/").pop() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="nexus-badge"
                      style={{
                        background: cron.is_loaded ? "var(--nexus-ok-glow)" : "rgba(75,85,99,0.15)",
                        color: cron.is_loaded ? "var(--nexus-ok)" : "var(--nexus-idle)",
                      }}
                    >
                      {cron.is_loaded ? "פעיל" : "כבוי"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: "var(--nexus-text-3)" }}>
                    לא נמצאו קרונים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--nexus-text-3)" }}>
        סה״כ: {crons.length} קרונים | {crons.filter((c) => c.is_loaded).length} פעילים
      </p>
    </div>
  );
}
