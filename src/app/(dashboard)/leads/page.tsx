"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs } from "@/components/ui/tabs";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadsTable } from "@/components/leads/leads-table";
import { LeadsKanban } from "@/components/leads/leads-kanban";
import { LayoutGrid, List } from "lucide-react";
import { clsx } from "clsx";
import type { Lead, LeadStatus, ProductType } from "@/lib/types/database";

const productTabs = [
  { key: "simply_grow", label: "פשוט לצמוח" },
  { key: "freedom", label: "החופש לשווק" },
];

const viewModes = [
  { key: "kanban", icon: LayoutGrid },
  { key: "table", icon: List },
];

const simplyGrowStatuses: LeadStatus[] = ["new", "watched_vsl", "got_wa", "filled_questionnaire", "sales_call", "closed"];
const freedomStatuses: LeadStatus[] = ["new", "closed"];

export default function LeadsPage() {
  const [product, setProduct] = useState<ProductType>("simply_grow");
  const [view, setView] = useState("kanban");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ product });
    if (search) params.set("search", search);
    if (source) params.set("source", source);
    if (status) params.set("status", status);

    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, [product, search, source, status]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const statuses = product === "simply_grow" ? simplyGrowStatuses : freedomStatuses;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold dark:text-gray-100">לידים</h1>
        <div className="flex items-center gap-3">
          <Tabs tabs={productTabs} activeTab={product} onChange={(key) => setProduct(key as ProductType)} />
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
        <LeadsKanban columns={columns} statuses={statuses} onStatusChange={handleStatusChange} />
      ) : (
        <LeadsTable leads={leads} />
      )}
    </div>
  );
}
