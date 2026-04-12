"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Zap, Plus, Edit2, Check, X } from "lucide-react";

interface ApiCost {
  id: string;
  service: string;
  period: string;
  units: number | null;
  cost_usd: number;
  notes: string | null;
  source: string;
}

const SERVICE_LABELS: Record<string, { label: string; desc: string }> = {
  claude_api: { label: "Claude API", desc: "Anthropic — Telegram bots (Jarvis/Mike/Ruti/CTO/Cassandra)" },
  apify: { label: "Apify", desc: "Instagram profile scraping" },
  vercel: { label: "Vercel", desc: "ONE-CRM hosting" },
  youtube: { label: "YouTube API", desc: "Free tier — creator sync" },
  other: { label: "Other", desc: "" },
};

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatUsd(n: number) {
  return n === 0 ? "Free" : `$${n.toFixed(2)}`;
}

export function ApiCostsWidget() {
  const period = getCurrentPeriod();
  const { data: costs, mutate } = useSWR<ApiCost[]>(`/api/api-costs?period=${period}`, fetcher);

  const [editing, setEditing] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({ service: "claude_api", cost_usd: "", notes: "" });

  const totalUsd = (costs ?? []).reduce((s, c) => s + (c.cost_usd || 0), 0);

  async function saveEdit(id: string) {
    await fetch("/api/api-costs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, cost_usd: parseFloat(editVal) || 0 }),
    });
    setEditing(null);
    mutate();
  }

  async function addCost() {
    await fetch("/api/api-costs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: newForm.service,
        period,
        cost_usd: parseFloat(newForm.cost_usd) || 0,
        notes: newForm.notes || null,
      }),
    });
    setShowAdd(false);
    setNewForm({ service: "claude_api", cost_usd: "", notes: "" });
    mutate();
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">עלויות Infrastructure</span>
          <span className="text-xs text-gray-400">{period}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-white">{formatUsd(totalUsd)}</span>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="flex gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex-wrap">
          <select
            value={newForm.service}
            onChange={(e) => setNewForm((f) => ({ ...f, service: e.target.value }))}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {Object.entries(SERVICE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="$0.00"
            value={newForm.cost_usd}
            onChange={(e) => setNewForm((f) => ({ ...f, cost_usd: e.target.value }))}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 w-20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="הערות..."
            value={newForm.notes}
            onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
            className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 flex-1 min-w-[100px] bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <button onClick={addCost} className="p-1 text-emerald-500 hover:text-emerald-600">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowAdd(false)} className="p-1 text-gray-400 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cost rows */}
      <div className="space-y-1">
        {(costs ?? []).map((cost) => {
          const svc = SERVICE_LABELS[cost.service] ?? { label: cost.service, desc: "" };
          return (
            <div key={cost.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-900 dark:text-white">{svc.label}</div>
                {svc.desc && <div className="text-[10px] text-gray-400 truncate">{svc.desc}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {editing === cost.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      className="w-16 text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(cost.id)}
                    />
                    <button onClick={() => saveEdit(cost.id)} className="text-emerald-500">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditing(null)} className="text-gray-400">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className={`text-xs font-semibold ${cost.cost_usd === 0 ? "text-emerald-500" : "text-gray-900 dark:text-white"}`}>
                      {formatUsd(cost.cost_usd)}
                    </span>
                    {cost.source === "manual" && (
                      <button
                        onClick={() => { setEditing(cost.id); setEditVal(String(cost.cost_usd)); }}
                        className="text-gray-300 hover:text-gray-500 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                    {cost.source === "api_sync" && (
                      <span className="text-[10px] text-gray-400">auto</span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {(!costs || costs.length === 0) && (
          <p className="text-xs text-gray-400 py-2 text-center">אין נתונים לחודש זה</p>
        )}
      </div>

      <p className="text-[10px] text-gray-400">
        Claude API — עדכן ידנית מ-Anthropic Console. Apify — מסתנכרן אוטומטית ב-1 לחודש.
      </p>
    </div>
  );
}
