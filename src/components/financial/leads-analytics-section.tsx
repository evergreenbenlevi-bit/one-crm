"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { SOURCE_LABELS, STAGE_LABELS, FUNNEL_STAGES } from "@/lib/queries/financial";
import type { FunnelStage } from "@/lib/queries/financial";

const SOURCE_COLORS: Record<string, string> = {
  campaign: "#ef4444",
  instagram: "#a855f7",
  youtube: "#f97316",
  referral: "#22c55e",
  organic: "#3b82f6",
  linkedin: "#0ea5e9",
  content: "#8b5cf6",
  webinar: "#f59e0b",
  skool: "#06b6d4",
  other: "#6b7280",
};

const STAGE_COLORS: Record<string, string> = {
  new: "#6b7280",
  consumed_content: "#8b5cf6",
  engaged: "#3b82f6",
  applied: "#f59e0b",
  qualified: "#f97316",
  onboarding: "#22c55e",
  active_client: "#ef4444",
};

interface LeadsAnalyticsSectionProps {
  leadsBySource: Record<string, number>;
  funnelCounts: Record<FunnelStage, number>;
  stageConversionRates: {
    from: string;
    to: string;
    fromLabel: string;
    toLabel: string;
    rate: number;
  }[];
  total: number;
}

export function LeadsAnalyticsSection({
  leadsBySource,
  funnelCounts,
  stageConversionRates,
  total,
}: LeadsAnalyticsSectionProps) {
  // Leads by source — sorted descending
  const sourceData = Object.entries(leadsBySource)
    .map(([key, value]) => ({
      key,
      name: SOURCE_LABELS[key] || key,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Funnel data — ordered by stage
  const funnelData = FUNNEL_STAGES.map((stage) => ({
    key: stage,
    name: STAGE_LABELS[stage] || stage,
    value: funnelCounts[stage] || 0,
  }));

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold dark:text-gray-100">Analytics — לידים</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {total} סה״כ
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads by Source */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
            Leads by Source
          </h3>

          {sourceData.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              אין נתוני מקורות בתקופה זו
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm">
                {sourceData.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SOURCE_COLORS[item.key] || "#6b7280" }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                    <span className="font-bold dark:text-gray-200">{item.value}</span>
                    {total > 0 && (
                      <span className="text-gray-400 dark:text-gray-500">
                        ({Math.round((item.value / total) * 100)}%)
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={Math.max(120, sourceData.length * 40)}>
                <BarChart
                  data={sourceData}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} לידים`, "כמות"]}
                    labelStyle={{ fontFamily: "Heebo" }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>
                    {sourceData.map((item) => (
                      <Cell
                        key={item.key}
                        fill={SOURCE_COLORS[item.key] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Funnel Conversion */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
            Funnel Conversion
          </h3>

          {funnelData.every((d) => d.value === 0) ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">
              אין נתוני פאנל בתקופה זו
            </p>
          ) : (
            <>
              {/* Stage conversion rate badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {stageConversionRates.map((r) => (
                  <div
                    key={`${r.from}-${r.to}`}
                    className="flex items-center gap-1 text-xs bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1"
                  >
                    <span className="text-gray-500 dark:text-gray-400">{r.fromLabel}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{r.rate}%</span>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={Math.max(200, funnelData.length * 36)}>
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={82}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value} לידים`, "שלב"]}
                    labelStyle={{ fontFamily: "Heebo" }}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>
                    {funnelData.map((item) => (
                      <Cell
                        key={item.key}
                        fill={STAGE_COLORS[item.key] || "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
