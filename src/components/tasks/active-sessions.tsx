"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Radio } from "lucide-react";
import { clsx } from "clsx";

interface Session {
  id: string;
  session_name: string;
  task_id: string | null;
  started_at: string;
  last_heartbeat: string;
  status: "active" | "stale" | "closed";
  tasks?: { id: string; title: string; status: string } | null;
}

export function ActiveSessions() {
  const { data: sessions = [] } = useSWR<Session[]>(
    "/api/sessions?status=active",
    fetcher,
    { refreshInterval: 30000 }
  );

  if (sessions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50/80 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
      <Radio size={14} className="text-green-500 animate-pulse" />
      <span className="text-[11px] text-green-700 dark:text-green-300 font-semibold">
        {sessions.length} {sessions.length === 1 ? "סשן פעיל" : "סשנים פעילים"}
      </span>
      <div className="flex gap-1">
        {sessions.slice(0, 3).map(s => (
          <span
            key={s.id}
            title={s.tasks?.title || s.session_name}
            className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 max-w-[120px] truncate"
          >
            {s.session_name}
          </span>
        ))}
        {sessions.length > 3 && (
          <span className="text-[10px] text-green-500">+{sessions.length - 3}</span>
        )}
      </div>
    </div>
  );
}
