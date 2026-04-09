"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type TableName = "agent_health_events" | "agent_runs" | "agent_edges";

interface UseAgentRealtimeOptions {
  table: TableName;
  filter?: string; // e.g. "agent_slug=eq.jarvis"
  onInsert?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
  onDelete?: (payload: Record<string, unknown>) => void;
  enabled?: boolean;
}

export function useAgentRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseAgentRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return;
    }

    const supabase = createClient();
    const channelName = `agents:${table}${filter ? `:${filter}` : ""}`;

    const channel = supabase.channel(channelName);

    const pgFilter: Record<string, string> = {
      event: "*",
      schema: "public",
      table,
    };
    if (filter) pgFilter.filter = filter;

    channel
      .on("postgres_changes", pgFilter as never, (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
        if (payload.eventType === "INSERT" && onInsert) onInsert(payload.new);
        if (payload.eventType === "UPDATE" && onUpdate) onUpdate(payload.new);
        if (payload.eventType === "DELETE" && onDelete) onDelete(payload.old);
      })
      .subscribe();

    channelRef.current = channel;

    return cleanup;
  }, [table, filter, enabled, cleanup, onInsert, onUpdate, onDelete]);

  return { unsubscribe: cleanup };
}
