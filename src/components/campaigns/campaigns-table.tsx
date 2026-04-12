"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react";
import type { Campaign, ProgramType } from "@/lib/types/database";

interface CampaignsTableProps {
  campaigns: Campaign[];
  avgDealSize?: number;
}

const productLabels: Record<string, string> = {
  one_core: "ONE™ Core",
  one_vip: "ONE™ VIP",
};

const programFilters = [
  { key: "all", label: "הכל" },
  { key: "one_core", label: "ONE™ Core" },
  { key: "one_vip", label: "ONE™ VIP" },
] as const;

const periodFilters = [
  { key: "week", label: "שבוע" },
  { key: "month", label: "חודש" },
  { key: "quarter", label: "רבעון" },
  { key: "all", label: "הכל" },
] as const;

type SortKey = "name" | "spend" | "leads" | "cpl" | "purchases" | "conversion" | "roas" | "ctr" | "cpc";
type SortDir = "asc" | "desc";

function formatCurrency(value: number): string {
  return `₪${value.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;
}

function getDateRange(period: string): { start: Date | null; end: Date | null } {
  const now = new Date();
  const end = now;
  let start: Date | null = null;

  switch (period) {
    case "week": {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      break;
    }
    default:
      return { start: null, end: null };
  }

  return { start, end };
}

interface AggregatedCampaign {
  name: string;
  program: ProgramType | null;
  totalSpend: number;
  totalLeads: number;
  totalPurchases: number;
  totalImpressions: number;
  totalClicks: number;
  cpl: number;
  conversion: number;
  ctr: number;
  cpc: number;
  roas: number;
}

export function CampaignsTable({ campaigns, avgDealSize: avgDealSizeProp = 0 }: CampaignsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const programFilter = searchParams.get("program") || "all";
  const periodFilter = searchParams.get("period") || "month";
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [avgDealSize, setAvgDealSize] = useState(avgDealSizeProp);

  // Auto-fetch avg deal size from /api/kpis if not provided
  useEffect(() => {
    if (avgDealSizeProp > 0) { setAvgDealSize(avgDealSizeProp); return; }
    const period = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    fetch(`/api/kpis?period=${period}`)
      .then((r) => r.json())
      .then((d) => { if (d.avg_deal_size > 0) setAvgDealSize(d.avg_deal_size); })
      .catch(() => {});
  }, [avgDealSizeProp]);

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/campaigns?${params.toString()}`);
  }

  // Filter by date period
  const filteredByDate = useMemo(() => {
    const { start } = getDateRange(periodFilter);
    if (!start) return campaigns;
    return campaigns.filter(c => new Date(c.date) >= start);
  }, [campaigns, periodFilter]);

  // Filter by product
  const filteredCampaigns = useMemo(() => {
    if (programFilter === "all") return filteredByDate;
    return filteredByDate.filter(c => c.program === programFilter);
  }, [filteredByDate, programFilter]);

  // Aggregate by campaign name
  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedCampaign>();

    for (const c of filteredCampaigns) {
      const existing = map.get(c.name);
      if (existing) {
        existing.totalSpend += Number(c.daily_spend);
        existing.totalLeads += Number(c.leads_count);
        existing.totalPurchases += Number(c.purchases);
        existing.totalImpressions += Number(c.impressions) || 0;
        existing.totalClicks += Number(c.clicks) || 0;
      } else {
        map.set(c.name, {
          name: c.name,
          program: c.program,
          totalSpend: Number(c.daily_spend),
          totalLeads: Number(c.leads_count),
          totalPurchases: Number(c.purchases),
          totalImpressions: Number(c.impressions) || 0,
          totalClicks: Number(c.clicks) || 0,
          cpl: 0,
          conversion: 0,
          ctr: 0,
          cpc: 0,
          roas: 0,
        });
      }
    }

    // Calculate derived metrics
    for (const agg of map.values()) {
      agg.cpl = agg.totalLeads > 0 ? agg.totalSpend / agg.totalLeads : 0;
      agg.conversion = agg.totalLeads > 0 ? (agg.totalPurchases / agg.totalLeads) * 100 : 0;
      agg.ctr = agg.totalImpressions > 0 ? (agg.totalClicks / agg.totalImpressions) * 100 : 0;
      agg.cpc = agg.totalClicks > 0 ? agg.totalSpend / agg.totalClicks : 0;
      agg.roas = agg.totalSpend > 0 && avgDealSize > 0 ? (agg.totalPurchases * avgDealSize) / agg.totalSpend : 0;
    }

    return Array.from(map.values());
  }, [filteredCampaigns]);

  // Sort
  const sorted = useMemo(() => {
    return [...aggregated].sort((a, b) => {
      let valA: number | string;
      let valB: number | string;

      switch (sortKey) {
        case "name": valA = a.name; valB = b.name; break;
        case "spend": valA = a.totalSpend; valB = b.totalSpend; break;
        case "leads": valA = a.totalLeads; valB = b.totalLeads; break;
        case "cpl": valA = a.cpl; valB = b.cpl; break;
        case "purchases": valA = a.totalPurchases; valB = b.totalPurchases; break;
        case "conversion": valA = a.conversion; valB = b.conversion; break;
        case "roas": valA = a.roas; valB = b.roas; break;
        case "ctr": valA = a.ctr; valB = b.ctr; break;
        case "cpc": valA = a.cpc; valB = b.cpc; break;
        default: valA = a.totalSpend; valB = b.totalSpend;
      }

      if (typeof valA === "string" && typeof valB === "string") {
        return sortDir === "asc" ? valA.localeCompare(valB, "he") : valB.localeCompare(valA, "he");
      }

      return sortDir === "asc"
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
  }, [aggregated, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  // Totals
  const totals = useMemo(() => {
    const spend = sorted.reduce((s, c) => s + c.totalSpend, 0);
    const leads = sorted.reduce((s, c) => s + c.totalLeads, 0);
    const purchases = sorted.reduce((s, c) => s + c.totalPurchases, 0);
    const impressions = sorted.reduce((s, c) => s + c.totalImpressions, 0);
    const clicks = sorted.reduce((s, c) => s + c.totalClicks, 0);
    const cpl = leads > 0 ? spend / leads : 0;
    const conversion = leads > 0 ? (purchases / leads) * 100 : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const roas = spend > 0 && avgDealSize > 0 ? (purchases * avgDealSize) / spend : 0;
    return { spend, leads, purchases, impressions, clicks, cpl, conversion, ctr, cpc, roas };
  }, [sorted]);

  const SortHeader = ({ label, column }: { label: string; column: SortKey }) => (
    <th
      className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={clsx(sortKey === column ? "text-brand-600" : "text-gray-300 dark:text-gray-600")} />
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          {programFilters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter("program", key)}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                programFilter === key
                  ? "bg-white dark:bg-gray-600 text-brand-600 shadow-sm dark:shadow-gray-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
          {periodFilters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter("period", key)}
              className={clsx(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                periodFilter === key
                  ? "bg-white dark:bg-gray-600 text-brand-600 shadow-sm dark:shadow-gray-900/20"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "הוצאה כוללת", value: formatCurrency(totals.spend) },
            { label: "לידים", value: totals.leads.toLocaleString("he-IL") },
            { label: "CPL", value: formatCurrency(totals.cpl) },
            { label: "CPC", value: totals.cpc > 0 ? formatCurrency(totals.cpc) : "—" },
            { label: "CTR", value: totals.ctr > 0 ? `${totals.ctr.toFixed(2)}%` : "—" },
            { label: "ROAS", value: totals.roas > 0 ? `×${totals.roas.toFixed(1)}` : "—" },
            { label: "רכישות", value: totals.purchases.toLocaleString("he-IL") },
            { label: "המרה", value: `${totals.conversion.toFixed(1)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</div>
              <div className="text-base font-bold text-gray-800 dark:text-gray-100">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500">
          אין נתוני קמפיינים לתקופה הנבחרת
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700">
                  <SortHeader label="שם הקמפיין" column="name" />
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">מוצר</th>
                  <SortHeader label="הוצאה" column="spend" />
                  <SortHeader label="לידים" column="leads" />
                  <SortHeader label="CPL" column="cpl" />
                  <SortHeader label="CTR" column="ctr" />
                  <SortHeader label="CPC" column="cpc" />
                  <SortHeader label="ROAS" column="roas" />
                  <SortHeader label="רכישות" column="purchases" />
                  <SortHeader label="המרה" column="conversion" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((campaign) => (
                  <tr key={campaign.name} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 font-medium dark:text-gray-200">{campaign.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {campaign.program ? (
                        <span className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                          {productLabels[campaign.program] || campaign.program}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatCurrency(campaign.totalSpend)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{campaign.totalLeads.toLocaleString("he-IL")}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{campaign.cpl > 0 ? formatCurrency(campaign.cpl) : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{campaign.ctr > 0 ? `${campaign.ctr.toFixed(2)}%` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{campaign.cpc > 0 ? formatCurrency(campaign.cpc) : "—"}</td>
                    <td className="px-4 py-3">
                      {campaign.roas > 0 ? (
                        <span className={clsx("font-medium text-sm", campaign.roas >= 3 ? "text-gray-800 dark:text-gray-200" : "text-gray-400 dark:text-gray-500")}>
                          ×{campaign.roas.toFixed(1)}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{campaign.totalPurchases.toLocaleString("he-IL")}</td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "font-medium",
                        campaign.conversion >= 5 ? "text-gray-800 dark:text-gray-200" : campaign.conversion >= 2 ? "text-gray-500 dark:text-gray-400" : "text-gray-300 dark:text-gray-600"
                      )}>
                        {campaign.conversion.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
