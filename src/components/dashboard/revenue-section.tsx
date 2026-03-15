"use client";

import { StatCard } from "@/components/ui/stat-card";
import { DollarSign, ShoppingBag } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueSectionProps {
  revenue: {
    total: number;
    freedom: number;
    simplyGrow: number;
    freedomCount: number;
    simplyGrowCount: number;
  };
  chartData: Array<{ amount: number; date: string; product: string }>;
}

export function RevenueSection({ revenue, chartData }: RevenueSectionProps) {
  // Group chart data by month
  const monthlyData = chartData.reduce<Record<string, { month: string; freedom: number; simplyGrow: number }>>((acc, item) => {
    const month = new Date(item.date).toLocaleDateString("he-IL", { month: "short", year: "2-digit" });
    if (!acc[month]) acc[month] = { month, freedom: 0, simplyGrow: 0 };
    if (item.product === "freedom") acc[month].freedom += Number(item.amount);
    else acc[month].simplyGrow += Number(item.amount);
    return acc;
  }, {});

  const chartEntries = Object.values(monthlyData);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <DollarSign size={20} className="text-brand-600" />
        הכנסות
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="סה״כ החודש"
          value={`₪${revenue.total.toLocaleString("he-IL")}`}
          icon={DollarSign}
        />
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <span className="text-sm text-gray-500">החופש לשווק</span>
          <div className="text-xl font-bold mt-1">₪{revenue.freedom.toLocaleString("he-IL")}</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <ShoppingBag size={12} />
            <span>{revenue.freedomCount} רוכשים</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <span className="text-sm text-gray-500">פשוט לצמוח</span>
          <div className="text-xl font-bold mt-1">₪{revenue.simplyGrow.toLocaleString("he-IL")}</div>
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
            <ShoppingBag size={12} />
            <span>{revenue.simplyGrowCount} לקוחות</span>
          </div>
        </div>
      </div>

      {chartEntries.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-4">טרנד הכנסות — 6 חודשים</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartEntries}>
              <defs>
                <linearGradient id="freedomGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0c99e9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0c99e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `₪${Number(value).toLocaleString("he-IL")}`} />
              <Area type="monotone" dataKey="freedom" stroke="#0c99e9" fill="url(#freedomGrad)" name="החופש לשווק" />
              <Area type="monotone" dataKey="simplyGrow" stroke="#10b981" fill="url(#sgGrad)" name="פשוט לצמוח" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
