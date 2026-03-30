"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { Tabs } from "@/components/ui/tabs";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadsKanban } from "@/components/leads/leads-kanban";
import { LeadAddModal } from "@/components/leads/lead-add-modal";
import { LayoutGrid, List, Plus, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import type { Lead, LeadStatus, ProgramType } from "@/lib/types/database";

const programTabs = [
  { key: "one_vip", label: "ONE\u2122 VIP" },
  { key: "one_core", label: "ONE\u2122 Core" },
];

const viewModes = [
  { key: "kanban", icon: LayoutGrid },
  { key: "table", icon: List },
];

const oneVipStatuses: LeadStatus[] = ["new", "consumed_content", "engaged", "applied", "qualified", "onboarding", "active_client"];
const oneCoreStatuses: LeadStatus[] = ["new", "consumed_content", "engaged", "applied", "qualified", "active_client"];

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

export default function LeadsPage() {
  const [program, setProgram] = useState<ProgramType>("one_vip");
  const [view, setView] = useState("kanban");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const pendingOps = useRef(new Set<string>());

  const params = new URLSearchParams({ program });
  if (search) params.set("search", search);
  if (source) params.set("source", source);
  if (status) params.set("status", status);
  const swrKey = `/api/leads?${params}`;

  const { data, isLoading, mutate } = useSWR<Lead[]>(swrKey, fetcher, {
    onError: () => setError("שגיאה בטעינת לידים. נסה לרענן."),
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const leads = data ?? [];
  const statuses = program === "one_vip" ? oneVipStatuses : oneCoreStatuses;

  const columns: Record<string, Lead[]> = {};
  statuses.forEach(s => { columns[s] = []; });
  leads.forEach(lead => {
    if (columns[lead.current_status]) {
      columns[lead.current_status].push(lead);
    }
  });

  // Auto-dismiss error
  function showError(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 5000);
  }

  async function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    if (pendingOps.current.has(leadId)) return;
    pendingOps.current.add(leadId);

    // Optimistic update
    mutate(
      prev => prev?.map(l => l.id === leadId ? { ...l, current_status: newStatus } : l),
      false
    );

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      mutate(); // revert by revalidating
      showError("שגיאה בעדכון סטטוס ליד");
    } finally {
      pendingOps.current.delete(leadId);
    }
  }

  async function handleBulkDelete(ids: string[]) {
    // Optimistic update
    mutate(prev => prev?.filter(l => !ids.includes(l.id)), false);

    try {
      const results = await Promise.allSettled(
        ids.map(id => fetch(`/api/leads/${id}`, { method: "DELETE" }))
      );
      const failedCount = results.filter(r => r.status === "rejected").length;
      if (failedCount > 0) {
        mutate(); // revert
        showError(`שגיאה במחיקת ${failedCount} לידים`);
      }
    } catch {
      mutate();
      showError("שגיאה במחיקת לידים");
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="mr-auto text-red-400 hover:text-red-600 dark:hover:text-red-200">✕</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold dark:text-gray-100">לידים</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <Plus size={16} />
            הוסף ליד
          </button>
          <Tabs tabs={programTabs} activeTab={program} onChange={(key) => setProgram(key as ProgramType)} />
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            {viewModes.map(mode => (
              <button
                key={mode.key}
                onClick={() => setView(mode.key)}
                className={clsx(
                  "p-2 rounded-lg transition-colors",
                  view === mode.key ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                )}
              >
                <mode.icon size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <LeadFilters
        search={search}
        onSearchChange={setSearch}
        source={source}
        onSourceChange={setSource}
        status={status}
        onStatusChange={setStatus}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-400 dark:text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-brand-600 rounded-full animate-spin" />
          טוען...
        </div>
      ) : view === "kanban" ? (
        <LeadsKanban columns={columns} statuses={statuses} onStatusChange={handleStatusChange} onDelete={(id) => handleBulkDelete([id])} />
      ) : (
        <LeadsTable leads={leads} onStatusChange={handleStatusChange} onBulkDelete={handleBulkDelete} />
      )}

      <LeadAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={() => mutate()}
        defaultProgram={program}
      />
    </div>
  );
}
