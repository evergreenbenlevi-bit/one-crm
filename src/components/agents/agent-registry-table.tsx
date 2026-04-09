"use client";

import { useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Search, Filter } from "lucide-react";
import { AgentHealthBadge } from "./agent-health-badge";
import type { AgentRecord, HealthStatus, AgentType } from "@/lib/types/agents";

const typeLabels: Record<AgentType, string> = {
  team: "צוות",
  agent: "אייג׳נט",
  bot: "בוט",
  skill: "סקיל",
  cron: "קרון",
  advisor: "יועץ",
};

const typeColors: Record<AgentType, string> = {
  team: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  agent: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  bot: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  skill: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  cron: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  advisor: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

interface Props {
  agents: AgentRecord[];
  healthMap: Record<string, HealthStatus>;
}

export function AgentRegistryTable({ agents, healthMap }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AgentType | "all">("all");

  const filtered = agents.filter((a) => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.slug.includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AgentType | "all")}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2"
          >
            <option value="all">הכל ({agents.length})</option>
            {(Object.keys(typeLabels) as AgentType[]).map((t) => {
              const count = agents.filter((a) => a.type === t).length;
              return count > 0 ? (
                <option key={t} value={t}>{typeLabels[t]} ({count})</option>
              ) : null;
            })}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                <th className="text-right px-4 py-3 font-medium">שם</th>
                <th className="text-right px-4 py-3 font-medium">סוג</th>
                <th className="text-right px-4 py-3 font-medium">מודל</th>
                <th className="text-right px-4 py-3 font-medium">ערוץ</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => (
                <tr
                  key={agent.slug}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/agents/registry/${agent.slug}`}
                      className="font-medium text-gray-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      {agent.name}
                    </Link>
                    {agent.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs mt-0.5">
                        {agent.description.slice(0, 80)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", typeColors[agent.type as AgentType])}>
                      {typeLabels[agent.type as AgentType] || agent.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {agent.model || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {agent.channel || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <AgentHealthBadge status={healthMap[agent.slug] || "unknown"} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    לא נמצאו רכיבים
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
