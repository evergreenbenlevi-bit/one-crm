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

interface RevenueBreakdownProps {
  freedom: number;
  simplyGrow: number;
}

export function RevenueBreakdown({ freedom, simplyGrow }: RevenueBreakdownProps) {
  const data = [
    { name: "החופש לשווק", value: freedom },
    { name: "פשוט לצמוח", value: simplyGrow },
  ];

  const colors = ["#0c99e9", "#7ccbfc"];
  const total = freedom + simplyGrow;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">הכנסות לפי מוצר</h3>

      <div className="flex gap-4 mb-4 text-sm">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i] }} />
            <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
            <span className="font-bold dark:text-gray-200">₪{item.value.toLocaleString("he-IL")}</span>
            {total > 0 && (
              <span className="text-gray-400 dark:text-gray-500">({Math.round((item.value / total) * 100)}%)</span>
            )}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 13, fill: "#6b7280" }}
          />
          <Tooltip
            formatter={(value) => `₪${Number(value).toLocaleString("he-IL")}`}
            labelStyle={{ fontFamily: "Heebo" }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
