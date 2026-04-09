"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { AgentChatPanel } from "@/components/agents/agent-chat-panel";
import { Loader2, MessageSquare } from "lucide-react";
import type { AgentRecord } from "@/lib/types/agents";

export default function AgentChatPage() {
  const [selectedSlug, setSelectedSlug] = useState<string>("");

  const { data: agents, isLoading } = useSWR<AgentRecord[]>(
    "/api/agents/registry",
    fetcher
  );

  const chatableAgents = (agents || []).filter(
    (a) => a.type === "agent" || a.type === "team" || a.type === "advisor"
  );

  const selectedAgent = chatableAgents.find((a) => a.slug === selectedSlug);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">צ׳אט עם אייג׳נטים</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">שוחח ישירות עם כל אייג׳נט במערכת</p>
        </div>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-4 py-2.5 min-w-[200px]"
        >
          <option value="">בחר אייג׳נט...</option>
          {chatableAgents.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name} ({a.type})
            </option>
          ))}
        </select>
      </div>

      {selectedAgent ? (
        <AgentChatPanel key={selectedAgent.slug} agent={selectedAgent} />
      ) : (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400">
          <MessageSquare size={48} className="mb-4 opacity-30" />
          <p className="text-sm">בחר אייג׳נט מהרשימה כדי להתחיל שיחה</p>
        </div>
      )}
    </div>
  );
}
