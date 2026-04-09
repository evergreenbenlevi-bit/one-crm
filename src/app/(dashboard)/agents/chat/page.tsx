"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { AgentChatPanel } from "@/components/agents/agent-chat-panel";
import { MessageSquare } from "lucide-react";
import type { AgentRecord } from "@/lib/types/agents";

export default function AgentChatPage() {
  const [selectedSlug, setSelectedSlug] = useState<string>("");

  const { data: agents, isLoading } = useSWR<AgentRecord[]>("/api/agents/registry", fetcher);

  const chatableAgents = (agents || []).filter(
    (a) => a.type === "agent" || a.type === "team" || a.type === "advisor"
  );

  const selectedAgent = chatableAgents.find((a) => a.slug === selectedSlug);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--nexus-text-1)" }}>צ׳אט עם אייג׳נטים</h2>
          <p className="text-sm" style={{ color: "var(--nexus-text-3)" }}>שוחח ישירות עם כל אייג׳נט במערכת</p>
        </div>
        <select
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          className="rounded-xl text-sm px-4 py-2.5 min-w-[200px] outline-none"
          style={{
            background: "var(--nexus-bg-card)",
            border: "1px solid var(--nexus-border)",
            color: "var(--nexus-text-1)",
          }}
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
        <div
          className="flex flex-col items-center justify-center h-96 rounded-2xl"
          style={{ background: "var(--nexus-bg-card)", border: "1px solid var(--nexus-border)" }}
        >
          <MessageSquare size={48} className="mb-4 opacity-20" style={{ color: "var(--nexus-accent)" }} />
          <p className="text-sm" style={{ color: "var(--nexus-text-3)" }}>בחר אייג׳נט מהרשימה כדי להתחיל שיחה</p>
        </div>
      )}
    </div>
  );
}
