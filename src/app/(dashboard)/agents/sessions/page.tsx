"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { Activity, FileText, Tag, Clock } from "lucide-react";

interface ClaudeActivityRow {
  id: string;
  session_id: string;
  event_type: string;
  summary?: string | null;
  file_path?: string | null;
  created_at: string;
}

interface SessionCard {
  session_id: string;
  last_event_type: string;
  last_summary: string | null;
  last_file_path: string | null;
  last_activity: string;
  is_ended: boolean;
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function groupBySession(rows: ClaudeActivityRow[]): SessionCard[] {
  const map = new Map<string, ClaudeActivityRow[]>();

  for (const row of rows) {
    if (!map.has(row.session_id)) map.set(row.session_id, []);
    map.get(row.session_id)!.push(row);
  }

  const now = Date.now();
  const thirtyMin = 30 * 60 * 1000;

  return Array.from(map.entries()).map(([session_id, events]) => {
    const sorted = [...events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latest = sorted[0];
    const hasEnd = events.some((e) => e.event_type === "session_end");
    const lastActivityMs = new Date(latest.created_at).getTime();
    const is_ended = hasEnd && now - lastActivityMs > thirtyMin;

    return {
      session_id,
      last_event_type: latest.event_type,
      last_summary: latest.summary ?? null,
      last_file_path: latest.file_path ?? null,
      last_activity: latest.created_at,
      is_ended,
    };
  }).sort(
    (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
  );
}

const EVENT_BADGE_STYLE: Record<string, { color: string; bg: string }> = {
  session_start: { color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
  prompt: { color: "#00D4FF", bg: "rgba(0,212,255,0.12)" },
  tool_use: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  session_end: { color: "#64748B", bg: "rgba(100,116,139,0.12)" },
};

function EventBadge({ type }: { type: string }) {
  const style = EVENT_BADGE_STYLE[type] ?? { color: "#94A3B8", bg: "rgba(148,163,184,0.12)" };
  return (
    <span
      className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
      style={{ color: style.color, background: style.bg, borderColor: style.color + "33" }}
    >
      {type}
    </span>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    async function fetchSessions() {
      const { data, error } = await supabase
        .from("claude_activity")
        .select("id, session_id, event_type, summary, file_path, created_at")
        .gte("created_at", twoHoursAgo)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSessions(groupBySession(data as ClaudeActivityRow[]));
      }
      setLoading(false);
    }

    fetchSessions();

    const channel = supabase
      .channel("claude_activity_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "claude_activity" },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold"
            style={{ color: "var(--nexus-text-1)" }}
          >
            סשנים פעילים
          </motion.h1>
          <p className="text-sm mt-1" style={{ color: "var(--nexus-text-2)" }}>
            Claude Code sessions — real-time · last 2h
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{ background: "var(--nexus-accent-glow)", color: "var(--nexus-accent)", fontFamily: "var(--nexus-font-mono)" }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--nexus-ok)", boxShadow: "0 0 6px #22C55E" }}
          />
          LIVE
        </div>
      </div>

      {/* Sessions grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="nexus-card p-5 animate-pulse"
              style={{ height: 140 }}
            />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div
          className="nexus-card p-10 flex flex-col items-center justify-center gap-3"
          style={{ color: "var(--nexus-text-3)" }}
        >
          <Activity size={32} strokeWidth={1.5} />
          <p className="text-sm">אין סשנים פעילים בשעתיים האחרונות</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <motion.div
              key={session.session_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="nexus-card p-5 space-y-3 transition-all"
              style={session.is_ended ? { opacity: 0.4 } : {}}
            >
              {/* Top row: session ID + badge */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className="font-mono text-sm font-semibold tracking-wider"
                  style={{ color: "var(--nexus-accent)" }}
                >
                  ...{session.session_id.slice(-8)}
                </span>
                <EventBadge type={session.last_event_type} />
              </div>

              {/* Summary */}
              {session.last_summary && (
                <p
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: "var(--nexus-text-2)" }}
                >
                  {session.last_summary}
                </p>
              )}

              {/* File path */}
              {session.last_file_path && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <FileText size={11} style={{ color: "var(--nexus-text-3)", flexShrink: 0 }} />
                  <span
                    className="text-[10px] font-mono truncate"
                    style={{ color: "var(--nexus-text-3)" }}
                    title={session.last_file_path}
                  >
                    {session.last_file_path}
                  </span>
                </div>
              )}

              {/* Time since last activity */}
              <div
                className="flex items-center gap-1.5 pt-1 border-t"
                style={{ borderColor: "var(--nexus-border)" }}
              >
                <Clock size={11} style={{ color: "var(--nexus-text-3)" }} />
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "var(--nexus-text-3)" }}
                >
                  {timeAgo(session.last_activity)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
