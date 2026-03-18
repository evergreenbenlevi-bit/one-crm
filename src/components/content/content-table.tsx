"use client";

import { clsx } from "clsx";
import { ArrowUpDown } from "lucide-react";

interface ContentMetric {
  id: string;
  platform: string;
  title: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  leads_generated: number;
}

const platformLabels: Record<string, string> = {
  instagram: "אינסטגרם",
  linkedin: "לינקדאין",
  youtube: "יוטיוב",
  tiktok: "טיקטוק",
};

const platformColors: Record<string, string> = {
  instagram: "bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  linkedin: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  youtube: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  tiktok: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

interface ContentTableProps {
  data: ContentMetric[];
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}

export function ContentTable({ data, sortBy, sortDir, onSort }: ContentTableProps) {
  const totals = data.reduce(
    (acc, row) => ({
      views: acc.views + (row.views || 0),
      likes: acc.likes + (row.likes || 0),
      comments: acc.comments + (row.comments || 0),
      saves: acc.saves + (row.saves || 0),
      leads_generated: acc.leads_generated + (row.leads_generated || 0),
    }),
    { views: 0, likes: 0, comments: 0, saves: 0, leads_generated: 0 }
  );

  const bestPost = data.length > 0
    ? data.reduce((best, row) => (row.leads_generated > best.leads_generated ? row : best), data[0])
    : null;

  const columns = [
    { key: "title", label: "כותרת" },
    { key: "platform", label: "פלטפורמה" },
    { key: "published_at", label: "תאריך" },
    { key: "views", label: "צפיות" },
    { key: "likes", label: "לייקים" },
    { key: "comments", label: "תגובות" },
    { key: "saves", label: "שמירות" },
    { key: "leads_generated", label: "לידים" },
  ];

  function SortHeader({ field, label }: { field: string; label: string }) {
    return (
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        {label}
        <ArrowUpDown size={12} className={clsx(sortBy === field && "text-brand-600 dark:text-brand-400")} />
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">סה״כ צפיות</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totals.views.toLocaleString("he-IL")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">סה״כ לייקים</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{totals.likes.toLocaleString("he-IL")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">סה״כ לידים</p>
          <p className="text-lg font-bold text-brand-700 dark:text-brand-400">{totals.leads_generated.toLocaleString("he-IL")}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">פוסטים</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{data.length}</p>
        </div>
        {bestPost && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">הכי מוצלח</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{bestPost.title}</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {columns.map(col => (
                <th key={col.key} className="px-4 py-3 text-right">
                  <SortHeader field={col.key} label={col.label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[200px] truncate">{row.title}</td>
                <td className="px-4 py-3">
                  <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", platformColors[row.platform] || platformColors.tiktok)}>
                    {platformLabels[row.platform] || row.platform}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(row.published_at).toLocaleDateString("he-IL")}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{(row.views || 0).toLocaleString("he-IL")}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{(row.likes || 0).toLocaleString("he-IL")}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{(row.comments || 0).toLocaleString("he-IL")}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{(row.saves || 0).toLocaleString("he-IL")}</td>
                <td className="px-4 py-3 font-medium text-brand-700 dark:text-brand-400">{(row.leads_generated || 0).toLocaleString("he-IL")}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">אין תוכן להצגה</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
