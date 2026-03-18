"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

interface TrendsChartProps {
  transactions: Array<{ amount: number; date: string; program: string }>;
  expenses: Array<{ amount: number; date: string }>;
  campaigns: Array<{ daily_spend: number; date: string }>;
}

interface MonthlyPoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export function TrendsChart({ transactions, expenses, campaigns }: TrendsChartProps) {
  // Aggregate all data by month
  const monthlyMap = new Map<string, { revenue: number; expenses: number }>();

  function getMonthKey(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function getOrInit(key: string) {
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, { revenue: 0, expenses: 0 });
    }
    return monthlyMap.get(key)!;
  }

  for (const t of transactions) {
    getOrInit(getMonthKey(t.date)).revenue += Number(t.amount);
  }

  for (const e of expenses) {
    getOrInit(getMonthKey(e.date)).expenses += Number(e.amount);
  }

  for (const c of campaigns) {
    getOrInit(getMonthKey(c.date)).expenses += Number(c.daily_spend);
  }

  const data: MonthlyPoint[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => {
      const [year, month] = key.split("-");
      const d = new Date(Number(year), Number(month) - 1);
      return {
        month: d.toLocaleDateString("he-IL", { month: "short", year: "2-digit" }),
        revenue: Math.round(val.revenue),
        expenses: Math.round(val.expenses),
        profit: Math.round(val.revenue - val.expenses),
      };
    });

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">טרנדים — 6 חודשים</h3>
        <div className="text-center text-gray-400 dark:text-gray-500 py-10">אין מספיק נתונים להצגת טרנדים</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">טרנדים — 6 חודשים</h3>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} />
          <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
          <Tooltip
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                revenue: "הכנסות",
                expenses: "הוצאות",
                profit: "רווח",
              };
              return [`₪${Number(value).toLocaleString("he-IL")}`, labels[String(name)] || String(name)];
            }}
            contentStyle={{ fontFamily: "Heebo", direction: "rtl" }}
          />
          <Legend
            formatter={(value) => {
              const labels: Record<string, string> = {
                revenue: "הכנסות",
                expenses: "הוצאות",
                profit: "רווח",
              };
              return labels[value] || value;
            }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#0c99e9"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#0c99e9" }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3, fill: "#ef4444" }}
            strokeDasharray="5 5"
          />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#10b981" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
