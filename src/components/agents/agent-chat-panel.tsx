"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { clsx } from "clsx";
import { Send, Loader2, Bot, User } from "lucide-react";
import type { AgentRecord } from "@/lib/types/agents";

interface Props {
  agent: AgentRecord;
}

export function AgentChatPanel({ agent }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agents/chat",
      body: { agentSlug: agent.slug },
    }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-320px)] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Agent Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Bot className="text-blue-600 dark:text-blue-400" size={16} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{agent.name}</p>
          {agent.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">{agent.description.slice(0, 100)}</p>
          )}
        </div>
        {agent.model && (
          <span className="mr-auto px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {agent.model}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            התחל שיחה עם {agent.name}
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={clsx("flex gap-3", m.role === "user" ? "flex-row-reverse" : "")}
          >
            <div
              className={clsx(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                m.role === "user"
                  ? "bg-brand-100 dark:bg-brand-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30"
              )}
            >
              {m.role === "user" ? (
                <User className="text-brand-600 dark:text-brand-400" size={14} />
              ) : (
                <Bot className="text-blue-600 dark:text-blue-400" size={14} />
              )}
            </div>
            <div
              className={clsx(
                "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                m.role === "user"
                  ? "bg-brand-600 text-white rounded-br-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md"
              )}
            >
              {m.parts?.map((p, i) =>
                p.type === "text" ? <span key={i}>{p.text}</span> : null
              )}
            </div>
          </div>
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1].role === "user" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Bot className="text-blue-600 dark:text-blue-400" size={14} />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-2.5">
              <Loader2 size={14} className="animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="כתוב הודעה..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            disabled={isStreaming}
            dir="rtl"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className={clsx(
              "p-2.5 rounded-xl transition-colors",
              input.trim() && !isStreaming
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400"
            )}
          >
            {isStreaming ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}
