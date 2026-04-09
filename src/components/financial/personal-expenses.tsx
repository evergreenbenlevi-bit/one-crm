"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ShoppingBag } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string | null;
  expense_type: string;
}

const personalCategoryLabels: Record<string, string> = {
  haircut: "תספורת",
  fuel: "דלק",
  car_wash: "שטיפת רכב",
  groceries: "מכולת",
  personal_other: "אחר",
};

const personalCategoryColors: Record<string, string> = {
  haircut: "#8b5cf6",
  fuel: "#f59e0b",
  car_wash: "#0ea5e9",
  groceries: "#10b981",
  personal_other: "#6b7280",
};

function formatCurrency(value: number): string {
  return `₪${value.toLocaleString("he-IL")}`;
}

export function PersonalExpenses() {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthEnd = now.toISOString().split("T")[0];

  const { data: expenses, error } = useSWR<Expense[]>(
    `/api/expenses?expense_type=personal&from=${monthStart}&to=${monthEnd}`,
    fetcher
  );

  const byCategory: Record<string, number> = {};
  let totalPersonal = 0;

  if (expenses) {
    expenses.forEach((e) => {
      const cat = e.category;
      byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount);
      totalPersonal += Number(e.amount);
    });
  }

  const chartData = Object.entries(byCategory)
    .map(([key, value]) => ({
      name: personalCategoryLabels[key] || key,
      value,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="הוצאות אישיות החודש"
          value={formatCurrency(totalPersonal)}
          icon={ShoppingBag}
          className="border-purple-100"
        />
        {chartData.slice(0, 2).map((item) => (
          <StatCard
            key={item.key}
            label={item.name}
            value={formatCurrency(item.value)}
            className="border-gray-100"
          />
        ))}
      </div>

      {/* Breakdown Chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">הוצאות אישיות לפי קטגוריה</h3>

          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm">
            {chartData.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: personalCategoryColors[item.key] || "#6b7280" }}
                />
                <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                <span className="font-bold dark:text-gray-200">{formatCurrency(item.value)}</span>
                {totalPersonal > 0 && (
                  <span className="text-gray-400 dark:text-gray-500">
                    ({Math.round((item.value / totalPersonal) * 100)}%)
                  </span>
                )}
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
                tick={{ fontSize: 13, fill: "#6b7280" }}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelStyle={{ fontFamily: "Heebo" }}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                {chartData.map((item) => (
                  <Cell key={item.key} fill={personalCategoryColors[item.key] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">פירוט הוצאות אישיות</h3>
        {error && <p className="text-red-500 text-sm">שגיאה בטעינה</p>}
        {!expenses && !error && <p className="text-gray-400 text-sm">טוען...</p>}
        {expenses && expenses.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">אין הוצאות אישיות החודש</p>
        )}
        {expenses && expenses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 font-medium">תאריך</th>
                  <th className="pb-2 font-medium">קטגוריה</th>
                  <th className="pb-2 font-medium">סכום</th>
                  <th className="pb-2 font-medium">תיאור</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  >
                    <td className="py-2.5 dark:text-gray-200">
                      {new Date(e.date).toLocaleDateString("he-IL")}
                    </td>
                    <td className="py-2.5 dark:text-gray-200">
                      {personalCategoryLabels[e.category] || e.category}
                    </td>
                    <td className="py-2.5 font-medium dark:text-gray-200">
                      {formatCurrency(Number(e.amount))}
                    </td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">
                      {e.description || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
