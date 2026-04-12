"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AddServiceCallModal } from "./add-service-call-modal";

interface ServiceCall {
  id: string;
  call_date: string;
  topic: string | null;
  response_time_hours: number | null;
  satisfaction_rating: number | null;
  nps_score: number | null;
  resolved: boolean;
  customers: { name: string } | null;
}

interface Props {
  calls: ServiceCall[];
  showAddButton?: boolean;
}

export function ServiceCallsClient({ calls: initialCalls, showAddButton }: Props) {
  const router = useRouter();
  const [calls, setCalls] = useState(initialCalls);
  const [modalOpen, setModalOpen] = useState(false);

  if (showAddButton) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors"
        >
          <Plus size={18} />
          הוסף שיחה
        </button>
        <AddServiceCallModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      </>
    );
  }

  async function handleToggleResolved(id: string, resolved: boolean) {
    const res = await fetch("/api/service-calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved }),
    });
    if (res.ok) {
      setCalls(prev => prev.map(c => c.id === id ? { ...c, resolved } : c));
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">תאריך</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">לקוח</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">נושא</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">זמן מענה</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">שביעות רצון</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">NPS</th>
              <th className="text-center px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">טופל</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400 dark:text-gray-500">
                  אין שיחות שירות עדיין
                </td>
              </tr>
            ) : (
              calls.map(call => (
                <tr key={call.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {new Date(call.call_date).toLocaleDateString("he-IL")}
                  </td>
                  <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                    {call.customers?.name || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-700 dark:text-gray-300">{call.topic || "—"}</td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                    {call.response_time_hours != null ? `${call.response_time_hours}ש׳` : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                    {call.satisfaction_rating != null ? `${call.satisfaction_rating}/10` : "—"}
                  </td>
                  <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                    {call.nps_score != null ? call.nps_score : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={call.resolved}
                      onChange={e => handleToggleResolved(call.id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
