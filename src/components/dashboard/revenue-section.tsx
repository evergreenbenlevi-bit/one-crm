"use client";

import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, ShoppingBag } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueSectionProps {
  revenue: {
    total: number;
    oneCore: number;
    oneVip: number;
    oneCoreCount: number;
    oneVipCount: number;
  };
  chartData: Array<{ amount: number; date: string; program: string }>;
}

export function RevenueSection({ revenue, chartData }: RevenueSectionProps) {
  // Group chart data by month
  const monthlyData = chartData.reduce<Record<string, { month: string; oneCore: number; oneVip: number }>>((acc, item) => {
    const month = new Date(item.date).toLocaleDateString("he-IL", { month: "short", year: "2-digit" });
    if (!acc[month]) acc[month] = { month, oneCore: 0, oneVip: 0 };
    if (item.program === "one_core") acc[month].oneCore += Number(item.amount);
    else acc[month].oneVip += Number(item.amount);
    return acc;
  }, {});

  const chartEntries = Object.values(monthlyData);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2 dark:text-gray-100">
        <DollarSign size={20} className="text-brand-600 dark:text-brand-400" />
        הכנסות
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="סה״כ החודש"
          value={`₪${revenue.total.toLocaleString("he-IL")}`}
          icon={DollarSign}
        />
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">ONE™ Core</span>
          <div className="text-xl font-bold mt-1 dark:text-gray-100">₪{revenue.oneCore.toLocaleString("he-IL")}</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
            <ShoppingBag size={12} />
            <span>{revenue.oneCoreCount} רוכשים</span>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">ONE™ VIP</span>
          <div className="text-xl font-bold mt-1 dark:text-gray-100">₪{revenue.oneVip.toLocaleString("he-IL")}</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
            <ShoppingBag size={12} />
            <span>{revenue.oneVipCount} לקוחות</span>
          </div>
        </div>
      </div>

      {chartEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">טרנד הכנסות — 6 חודשים</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartEntries}>
              <defs>
                <linearGradient id="oneCoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0c99e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0c99e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="oneVipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `₪${Number(value).toLocaleString("he-IL")}`} />
              <Area type="monotone" dataKey="oneCore" stroke="#0c99e9" fill="url(#oneCoreGrad)" name="ONE™ Core" />
              <Area type="monotone" dataKey="oneVip" stroke="#10b981" fill="url(#oneVipGrad)" name="ONE™ VIP" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
