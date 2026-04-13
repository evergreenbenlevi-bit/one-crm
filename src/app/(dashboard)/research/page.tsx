"use client";

import { useState } from "react";
import useSWR from "swr";
import { FlaskConical, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { fetcher } from "@/lib/fetcher";

interface ResearchItem {
  id: string;
  title: string;
  research_date: string;
  category: string;
  status: string;
  file_path: string | null;
  action_taken: string | null;
  notes: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "עוד לא קיבל התייחסות",
  waiting_ben: "ממתין לתשובת בן",
  implementing: "הטמעה בתהליך",
  done: "יושם / הושלם",
  cancelled: "בוטל",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800",
  waiting_ben: "bg-gray-600 text-white dark:bg-gray-400 dark:text-gray-900",
  implementing: "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100",
  done: "border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500",
  cancelled: "border border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  tech_tools: "Tech / Tools",
  content_social: "Content / Social",
  business_strategy: "Business / Strategy",
  systems_automation: "Systems / Automation",
  ai_agents: "AI / Agents",
  personal: "Personal",
};

const STATUS_FILTERS = ["all", "pending", "waiting_ben", "implementing", "done", "cancelled"];
const CATEGORY_FILTERS = ["all", "tech_tools", "content_social", "business_strategy", "systems_automation", "ai_agents", "personal"];

export default function ResearchPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const searchParams = new URLSearchParams();
  if (statusFilter !== "all") searchParams.set("status", statusFilter);
  if (categoryFilter !== "all") searchParams.set("category", categoryFilter);

  const { data, isLoading: loading, mutate } = useSWR(
    `/api/research?${searchParams}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );
  const items: ResearchItem[] = Array.isArray(data) ? data : [];

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/research", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    mutate();
  };

  const counts = Object.fromEntries(
    ["pending", "waiting_ben", "implementing", "done"].map(s => [
      s, items.filter(i => i.status === s).length
    ])
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <FlaskConical className="h-6 w-6 text-gray-500 dark:text-gray-400" />
        <h1 className="text-2xl font-bold">מחקרים</h1>
        <span className="text-sm text-gray-500 mr-2">admin only</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { key: "pending", label: "ממתינים", color: "text-gray-900 dark:text-gray-100" },
          { key: "waiting_ben", label: "ממתין לבן", color: "text-gray-700 dark:text-gray-300" },
          { key: "implementing", label: "בתהליך", color: "text-gray-500 dark:text-gray-400" },
          { key: "done", label: "יושם", color: "text-gray-400 dark:text-gray-500" },
        ].map(({ key, label, color }) => (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className={clsx("text-2xl font-bold", color)}>{counts[key] ?? 0}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={clsx(
                "px-3 py-1 rounded-full text-sm transition-colors",
                statusFilter === s
                  ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              )}
            >
              {s === "all" ? "הכל" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {CATEGORY_FILTERS.map(c => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={clsx(
              "px-3 py-1 rounded-full text-sm transition-colors",
              categoryFilter === c
                ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            )}
          >
            {c === "all" ? "כל הקטגוריות" : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-right px-4 py-3 font-medium text-gray-500">תאריך</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">כותרת</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">קטגוריה</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">פעולה שנגזרה</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(item.research_date).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {item.title}
                      {item.file_path && (
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {CATEGORY_LABELS[item.category] || item.category}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={item.status}
                      onChange={(e) => updateStatus(item.id, e.target.value)}
                      className={clsx(
                        "text-xs px-2 py-1 rounded-full border-0 cursor-pointer font-medium",
                        STATUS_COLORS[item.status]
                      )}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {item.action_taken || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">אין תוצאות</div>
          )}
        </div>
      )}
    </div>
  );
}
