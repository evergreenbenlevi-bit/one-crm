"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Receipt, FileText, Check, Search } from "lucide-react";
import { clsx } from "clsx";

interface ReceiptRow {
  id: string;
  expense_id: string | null;
  vendor: string;
  amount: number;
  receipt_date: string;
  file_url: string | null;
  sent_to_accountant: boolean;
  sent_date: string | null;
  notes: string | null;
  expenses: {
    id: string;
    description: string | null;
    category: string;
    amount: number;
    date: string;
  } | null;
}

const sentFilterOptions = [
  { value: "all", label: "הכל" },
  { value: "false", label: "לא נשלח" },
  { value: "true", label: "נשלח" },
];

export function ReceiptsTable() {
  const [sentFilter, setSentFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (sentFilter !== "all") params.set("sent", sentFilter);

  const { data: receipts, error, mutate } = useSWR<ReceiptRow[]>(
    `/api/receipts?${params.toString()}`,
    fetcher
  );

  const markAsSent = async (id: string) => {
    await fetch(`/api/receipts?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sent_to_accountant: true,
        sent_date: new Date().toISOString(),
      }),
    });
    mutate();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-brand-600 dark:text-brand-400" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">קבלות</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200"
          placeholder="מתאריך"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200"
          placeholder="עד תאריך"
        />
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          {sentFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSentFilter(opt.value)}
              className={clsx(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                sentFilter === opt.value
                  ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {error && <p className="text-red-500 text-sm">שגיאה בטעינה</p>}
      {!receipts && !error && <p className="text-gray-400 text-sm">טוען...</p>}
      {receipts && receipts.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">אין קבלות</p>
      )}
      {receipts && receipts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="pb-2 font-medium">תאריך</th>
                <th className="pb-2 font-medium">ספק</th>
                <th className="pb-2 font-medium">סכום</th>
                <th className="pb-2 font-medium">הוצאה מקושרת</th>
                <th className="pb-2 font-medium">נשלח לרו״ח</th>
                <th className="pb-2 font-medium">תאריך שליחה</th>
                <th className="pb-2 font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="py-2.5 dark:text-gray-200">
                    {r.receipt_date ? new Date(r.receipt_date).toLocaleDateString("he-IL") : "—"}
                  </td>
                  <td className="py-2.5 dark:text-gray-200">{r.vendor}</td>
                  <td className="py-2.5 font-medium dark:text-gray-200">
                    ₪{Number(r.amount).toLocaleString("he-IL")}
                  </td>
                  <td className="py-2.5 dark:text-gray-300">
                    {r.expenses ? (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                        {r.expenses.description || r.expenses.category}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5">
                    {r.sent_to_accountant ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                        <Check size={14} /> נשלח
                      </span>
                    ) : (
                      <span className="text-yellow-600 dark:text-yellow-400 text-xs">ממתין</span>
                    )}
                  </td>
                  <td className="py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                    {r.sent_date ? new Date(r.sent_date).toLocaleDateString("he-IL") : "—"}
                  </td>
                  <td className="py-2.5">
                    {!r.sent_to_accountant && (
                      <button
                        onClick={() => markAsSent(r.id)}
                        className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-2.5 py-1 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                      >
                        סמן כנשלח
                      </button>
                    )}
                    {r.file_url && (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mr-2"
                      >
                        <FileText size={14} className="inline" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
