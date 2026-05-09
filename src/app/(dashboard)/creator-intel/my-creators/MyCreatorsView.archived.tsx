"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Plus, RefreshCw, Search, Zap } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { CreatorCard, type Creator } from "./CreatorCard";
import { AddCreatorModal } from "./AddCreatorModal";
import { ExamplesDrawer } from "./ExamplesDrawer";

const DOMAIN_TABS = [
  { key: "all", label: "הכל" },
  { key: "manifesto", label: "Manifesto" },
  { key: "ai_tech", label: "AI / Tech" },
  { key: "business", label: "Business" },
  { key: "personal", label: "Personal" },
];

const FORMAT_TABS = [
  { key: "all", label: "All" },
  { key: "short_form", label: "Short" },
  { key: "long_form", label: "Long" },
];

const STATUS_ORDER: Record<string, number> = { full: 0, partial: 1, none: 2 };

export default function MyCreatorsView() {
  const [domain, setDomain] = useState("all");
  const [format, setFormat] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [drawerCreator, setDrawerCreator] = useState<Creator | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: creators, isLoading } = useSWR<Creator[]>(
    `/api/creators?active=true&k=${refreshKey}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function handleDeactivate(creatorId: string) {
    if (!confirm("הסר creator מהרשימה?")) return;
    await fetch(`/api/creators?id=${creatorId}`, { method: "DELETE" });
    refresh();
  }

  async function handleSyncYoutube() {
    setSyncing(true);
    try {
      const res = await fetch("/api/crons/youtube-sync");
      const data = await res.json();
      alert(`Sync הושלם: ${data.synced ?? 0}/${data.total ?? 0} creators עודכנו`);
      refresh();
    } catch {
      alert("Sync נכשל — בדוק console");
    } finally {
      setSyncing(false);
    }
  }

  const filtered = (creators ?? [])
    .filter((c) => {
      if (domain !== "all" && c.domain !== domain) return false;
      if (format !== "all" && c.format_type !== format) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (c.handle || "").toLowerCase().includes(q) ||
          (c.display_name || "").toLowerCase().includes(q) ||
          (c.domain || "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const sa = STATUS_ORDER[a.analysis_status ?? "none"] ?? 2;
      const sb = STATUS_ORDER[b.analysis_status ?? "none"] ?? 2;
      return sa - sb;
    });

  const total = creators?.length ?? 0;
  const shortForm = creators?.filter((c) => c.format_type === "short_form").length ?? 0;
  const fullAnalysis = creators?.filter((c) => c.analysis_status === "full").length ?? 0;
  const synced = creators?.filter((c) => c.last_synced_at).length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "סה״כ creators", value: total },
          { label: "Short Form", value: shortForm },
          { label: "Long Form", value: total - shortForm },
          { label: "ניתוח מלא", value: fullAnalysis },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        {/* Domain + format tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {DOMAIN_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDomain(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                domain === tab.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-0.5" />
          {FORMAT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFormat(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                format === tab.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search + actions */}
        <div className="flex items-center gap-2 justify-between">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש..."
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">{synced} synced</span>
            <button
              onClick={handleSyncYoutube}
              disabled={syncing}
              title="Sync YouTube"
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-yellow-500 hover:border-yellow-400 disabled:opacity-50 transition-colors"
            >
              <Zap className={`w-4 h-4 ${syncing ? "animate-pulse" : ""}`} />
            </button>
            <button
              onClick={refresh}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              הוסף
            </button>
          </div>
        </div>
      </div>

      {/* Creator grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          אין creators עם הפילטרים האלה
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((creator) => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onDeactivate={handleDeactivate}
              onViewExamples={setDrawerCreator}
            />
          ))}
        </div>
      )}

      {showAdd && <AddCreatorModal onClose={() => setShowAdd(false)} onAdded={refresh} />}
      <ExamplesDrawer
        creator={drawerCreator}
        onClose={() => setDrawerCreator(null)}
        onSaved={refresh}
      />
    </div>
  );
}
