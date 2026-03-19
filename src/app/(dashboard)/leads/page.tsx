"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs } from "@/components/ui/tabs";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadsKanban } from "@/components/leads/leads-kanban";
import { LeadAddModal } from "@/components/leads/lead-add-modal";
import { LayoutGrid, List, Plus } from "lucide-react";
import { clsx } from "clsx";
import type { Lead, LeadStatus, ProgramType } from "@/lib/types/database";

const programTabs = [
  { key: "one_vip", label: "ONE™ VIP" },
  { key: "one_core", label: "ONE™ Core" },
];

const viewModes = [
  { key: "kanban", icon: LayoutGrid },
  { key: "table", icon: List },
];

const oneVipStatuses: LeadStatus[] = ["new", "consumed_content", "engaged", "applied", "qualified", "onboarding", "active_client"];
const oneCoreStatuses: LeadStatus[] = ["new", "consumed_content", "engaged", "applied", "qualified", "active_client"];

export default function LeadsPage() {
  const [program, setProgram] = useState<ProgramType>("one_vip");
  const [view, setView] = useState("kanban");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ program: program });
    if (search) params.set("search", search);
    if (source) params.set("source", source);
    if (status) params.set("status", status);

    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, [program, search, source, status]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const statuses = program === "one_vip" ? oneVipStatuses : oneCoreStatuses;

  const columns: Record<string, Lead[]> = {};
  statuses.forEach(s => { columns[s] = []; });
  leads.forEach(lead => {
    if (columns[lead.current_status]) {
      columns[lead.current_status].push(lead);
    }
  });

  async function handleStatusChange(leadId: string, newStatus: LeadStatus) {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, current_status: newStatus } : l));

    await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function handleBulkDelete(ids: string[]) {
    // Optimistic update
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    await Promise.all(ids.map(id => fetch(`/api/leads/${id}`, { method: "DELETE" })));
  }

  return (
    <div className="space-y-6">
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

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">טוען...</div>
      ) : view === "kanban" ? (
        <LeadsKanban columns={columns} statuses={statuses} onStatusChange={handleStatusChange} onDelete={(id) => handleBulkDelete([id])} />
      ) : (
        <LeadsTable leads={leads} onStatusChange={handleStatusChange} onBulkDelete={handleBulkDelete} />
      )}

      <LeadAddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchLeads}
        defaultProgram={program}
      />
    </div>
  );
}
