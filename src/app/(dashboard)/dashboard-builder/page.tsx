"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Plus, Trash2, Save, BarChart3, PieChart, Hash, Table } from "lucide-react";

// ── Types ──

type WidgetType = "number" | "bar" | "pie" | "table";
type DataSource = "leads_count" | "leads_by_status" | "leads_by_source" | "expenses_sum" | "expenses_by_category" | "transactions_revenue";

interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: DataSource;
  color?: string;
}

interface Dashboard {
  id: string;
  name: string;
  config: { widgets: WidgetConfig[] };
  created_at: string;
  updated_at: string;
}

const dataSourceLabels: Record<DataSource, string> = {
  leads_count: "מספר לידים",
  leads_by_status: "לידים לפי סטטוס",
  leads_by_source: "לידים לפי מקור",
  expenses_sum: "סה״כ הוצאות",
  expenses_by_category: "הוצאות לפי קטגוריה",
  transactions_revenue: "הכנסות",
};

const widgetTypeLabels: Record<WidgetType, string> = {
  number: "מספר בודד",
  bar: "גרף עמודות",
  pie: "גרף עוגה",
  table: "טבלה",
};

const widgetIcons: Record<WidgetType, typeof Hash> = {
  number: Hash,
  bar: BarChart3,
  pie: PieChart,
  table: Table,
};

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

// ── Widget Components ──

function NumberWidget({ config, data }: { config: WidgetConfig; data: number | null }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{config.title}</div>
      <div className="text-3xl font-bold dark:text-gray-100" style={{ color: config.color || "#6366f1" }}>
        {data ?? "..."}
      </div>
    </div>
  );
}

function BarChartWidget({ config, data }: { config: WidgetConfig; data: Record<string, number> | null }) {
  if (!data) return <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"><div className="text-gray-400">טוען...</div></div>;
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{config.title}</div>
      <div className="space-y-2">
        {entries.map(([label, value], i) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-20 text-xs text-gray-500 dark:text-gray-400 truncate text-right">{label}</div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
              />
            </div>
            <div className="w-8 text-xs text-gray-600 dark:text-gray-400 text-left">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PieChartWidget({ config, data }: { config: WidgetConfig; data: Record<string, number> | null }) {
  if (!data) return <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"><div className="text-gray-400">טוען...</div></div>;
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{config.title}</div>
      <div className="space-y-2">
        {entries.map(([label, value], i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <div className="flex-1 text-sm dark:text-gray-300">{label}</div>
            <div className="text-sm font-medium dark:text-gray-200">{value}</div>
            <div className="text-xs text-gray-400 w-10 text-left">{Math.round((value / total) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableWidget({ config, data }: { config: WidgetConfig; data: Record<string, number> | null }) {
  if (!data) return <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"><div className="text-gray-400">טוען...</div></div>;
  const entries = Object.entries(data);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{config.title}</div>
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([label, value]) => (
            <tr key={label} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
              <td className="py-2 text-gray-600 dark:text-gray-400">{label}</td>
              <td className="py-2 text-left font-medium dark:text-gray-200">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ──

export default function DashboardBuilderPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [dashboardName, setDashboardName] = useState("דשבורד חדש");
  const [saving, setSaving] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);

  // Widget data
  const [widgetData, setWidgetData] = useState<Record<string, number | Record<string, number> | null>>({});

  // Fetch dashboards list
  const loadDashboards = useCallback(async () => {
    const res = await fetch("/api/dashboards");
    if (res.ok) {
      const data = await res.json();
      setDashboards(data);
      if (data.length > 0 && !activeDashboard) {
        setActiveDashboard(data[0]);
        setWidgets(data[0].config?.widgets || []);
        setDashboardName(data[0].name);
      }
    }
  }, [activeDashboard]);

  useEffect(() => { loadDashboards(); }, [loadDashboards]);

  // Fetch data for all widgets
  const fetchWidgetData = useCallback(async () => {
    const newData: Record<string, number | Record<string, number> | null> = {};

    for (const w of widgets) {
      try {
        if (w.dataSource === "leads_count") {
          const res = await fetch("/api/leads?limit=1000");
          if (res.ok) { const d = await res.json(); newData[w.id] = Array.isArray(d) ? d.length : (d.data?.length ?? 0); }
        } else if (w.dataSource === "leads_by_status") {
          const res = await fetch("/api/leads?limit=1000");
          if (res.ok) {
            const leads = Array.isArray(await res.clone().json()) ? await res.json() : (await res.json()).data || [];
            const grouped: Record<string, number> = {};
            for (const l of leads) { grouped[l.current_status] = (grouped[l.current_status] || 0) + 1; }
            newData[w.id] = grouped;
          }
        } else if (w.dataSource === "leads_by_source") {
          const res = await fetch("/api/leads?limit=1000");
          if (res.ok) {
            const leads = Array.isArray(await res.clone().json()) ? await res.json() : (await res.json()).data || [];
            const grouped: Record<string, number> = {};
            for (const l of leads) { grouped[l.source || "other"] = (grouped[l.source || "other"] || 0) + 1; }
            newData[w.id] = grouped;
          }
        } else if (w.dataSource === "expenses_sum") {
          const res = await fetch("/api/expenses");
          if (res.ok) {
            const expenses = await res.json();
            newData[w.id] = Array.isArray(expenses) ? expenses.reduce((s: number, e: { amount: number }) => s + (e.amount || 0), 0) : 0;
          }
        } else if (w.dataSource === "expenses_by_category") {
          const res = await fetch("/api/expenses");
          if (res.ok) {
            const expenses = await res.json();
            const grouped: Record<string, number> = {};
            if (Array.isArray(expenses)) {
              for (const e of expenses) { grouped[e.category] = (grouped[e.category] || 0) + e.amount; }
            }
            newData[w.id] = grouped;
          }
        } else if (w.dataSource === "transactions_revenue") {
          // Use leads converted to customers as proxy
          const res = await fetch("/api/customers");
          if (res.ok) {
            const customers = await res.json();
            newData[w.id] = Array.isArray(customers) ? customers.reduce((s: number, c: { total_paid: number }) => s + (c.total_paid || 0), 0) : 0;
          }
        }
      } catch {
        newData[w.id] = null;
      }
    }
    setWidgetData(newData);
  }, [widgets]);

  useEffect(() => {
    if (widgets.length > 0) fetchWidgetData();
  }, [widgets, fetchWidgetData]);

  function addWidget(type: WidgetType, dataSource: DataSource) {
    const newWidget: WidgetConfig = {
      id: crypto.randomUUID(),
      type,
      title: `${widgetTypeLabels[type]} — ${dataSourceLabels[dataSource]}`,
      dataSource,
      color: COLORS[widgets.length % COLORS.length],
    };
    setWidgets(prev => [...prev, newWidget]);
    setShowAddPanel(false);
  }

  function removeWidget(id: string) {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }

  async function saveDashboard() {
    setSaving(true);
    const config = { widgets };

    if (activeDashboard) {
      await fetch(`/api/dashboards?id=${activeDashboard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dashboardName, config }),
      });
    } else {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: dashboardName, config }),
      });
      if (res.ok) {
        const d = await res.json();
        setActiveDashboard(d);
      }
    }
    await loadDashboards();
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <input
            value={dashboardName}
            onChange={e => setDashboardName(e.target.value)}
            className="text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-brand-500 dark:focus:border-brand-400 outline-none dark:text-gray-100 transition-colors"
          />
          {dashboards.length > 1 && (
            <select
              value={activeDashboard?.id || ""}
              onChange={e => {
                const d = dashboards.find(d => d.id === e.target.value);
                if (d) { setActiveDashboard(d); setWidgets(d.config?.widgets || []); setDashboardName(d.name); }
              }}
              className="rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 text-sm"
            >
              {dashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            <Plus size={16} /> הוסף ווידג׳ט
          </button>
          <button
            onClick={saveDashboard}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50 disabled:opacity-40 transition-colors"
          >
            <Save size={16} /> {saving ? "שומר..." : "שמור"}
          </button>
        </div>
      </div>

      {/* Add widget panel */}
      {showAddPanel && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">בחר ווידג׳ט</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(Object.entries(widgetTypeLabels) as [WidgetType, string][]).map(([wType, wLabel]) => {
              const Icon = widgetIcons[wType];
              return (Object.entries(dataSourceLabels) as [DataSource, string][]).map(([ds, dsLabel]) => {
                // number widgets only for count/sum sources
                if (wType === "number" && !["leads_count", "expenses_sum", "transactions_revenue"].includes(ds)) return null;
                // bar/pie/table only for grouped sources
                if (wType !== "number" && ["leads_count", "expenses_sum", "transactions_revenue"].includes(ds)) return null;

                return (
                  <button
                    key={`${wType}-${ds}`}
                    onClick={() => addWidget(wType, ds)}
                    className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:border-brand-300 dark:hover:border-brand-600 transition-colors text-right"
                  >
                    <Icon size={18} className="text-brand-500 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium dark:text-gray-200">{wLabel}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{dsLabel}</div>
                    </div>
                  </button>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* Widgets grid */}
      {widgets.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">אין ווידג׳טים עדיין</p>
          <p className="text-sm mt-1">לחץ על &quot;הוסף ווידג׳ט&quot; כדי להתחיל</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {widgets.map(w => (
            <div key={w.id} className="relative group">
              <button
                onClick={() => removeWidget(w.id)}
                className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
              >
                <Trash2 size={14} />
              </button>

              {w.type === "number" && <NumberWidget config={w} data={widgetData[w.id] as number | null} />}
              {w.type === "bar" && <BarChartWidget config={w} data={widgetData[w.id] as Record<string, number> | null} />}
              {w.type === "pie" && <PieChartWidget config={w} data={widgetData[w.id] as Record<string, number> | null} />}
              {w.type === "table" && <TableWidget config={w} data={widgetData[w.id] as Record<string, number> | null} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
