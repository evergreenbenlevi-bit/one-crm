"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Users, Target, DollarSign, BarChart3 } from "lucide-react";
import { clsx } from "clsx";

interface KpiData {
  roas: number;
  cac: number;
  ltv: number;
  retention_rate: number;
  churn_rate: number;
  net_profit: number;
  gross_revenue: number;
  total_ad_spend: number;
  note_roas: string | null;
  note_ltv: string | null;
}

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1000) return `₪${(n / 1000).toFixed(1)}K`;
  return `₪${Math.round(n).toLocaleString("he-IL")}`;
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  positive,
  note,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  positive?: boolean;
  note?: string | null;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{label}</span>
        <Icon size={14} className="text-gray-300 dark:text-gray-600" />
      </div>
      <div
        className={clsx(
          "text-xl font-bold",
          positive === true
            ? "text-gray-900 dark:text-gray-100"
            : positive === false
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-900 dark:text-gray-100"
        )}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>}
      {note && <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-1 leading-tight">{note}</div>}
    </div>
  );
}

export function KpiStrip() {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const period = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    })();
    fetch(`/api/kpis?period=${period}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const ROAS_TARGET = 3;
  const CAC_TARGET = 2000;
  const RETENTION_TARGET = 70;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <KpiCard
        label="ROAS"
        value={data.roas > 0 ? `×${data.roas}` : "—"}
        sub={data.roas > 0 ? (data.roas >= ROAS_TARGET ? "מעל היעד ✓" : `יעד: ×${ROAS_TARGET}`) : undefined}
        icon={BarChart3}
        positive={data.roas === 0 ? undefined : data.roas >= ROAS_TARGET}
        note={data.note_roas ?? undefined}
      />
      <KpiCard
        label="CAC"
        value={data.cac > 0 ? formatCurrency(data.cac) : "—"}
        sub={data.cac > 0 ? (data.cac <= CAC_TARGET ? `יעד: <${formatCurrency(CAC_TARGET)} ✓` : `יעד: <${formatCurrency(CAC_TARGET)}`) : undefined}
        icon={Target}
        positive={data.cac === 0 ? undefined : data.cac <= CAC_TARGET}
      />
      <KpiCard
        label="LTV ממוצע"
        value={data.ltv > 0 ? formatCurrency(data.ltv) : "—"}
        sub="לכל לקוח"
        icon={Users}
        note={data.note_ltv ?? undefined}
      />
      <KpiCard
        label="שימור לקוחות"
        value={data.retention_rate > 0 ? `${data.retention_rate}%` : "—"}
        sub={data.retention_rate >= RETENTION_TARGET ? "מעל היעד ✓" : `יעד: ${RETENTION_TARGET}%`}
        icon={TrendingUp}
        positive={data.retention_rate === 0 ? undefined : data.retention_rate >= RETENTION_TARGET}
      />
      <KpiCard
        label="נטישה"
        value={data.churn_rate > 0 ? `${data.churn_rate}%` : "—"}
        sub="מלקוחות החודש"
        icon={TrendingDown}
        positive={data.churn_rate === 0 ? undefined : data.churn_rate <= 10}
      />
      <KpiCard
        label="רווח נקי"
        value={data.net_profit !== 0 ? formatCurrency(data.net_profit) : "—"}
        sub="אחרי מע״מ + מס"
        icon={DollarSign}
        positive={data.net_profit === 0 ? undefined : data.net_profit > 0}
      />
    </div>
  );
}
