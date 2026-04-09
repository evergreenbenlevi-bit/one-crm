"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const categoryLabels: Record<string, string> = {
  meta_ads: "פרסום מטא",
  ai_tools: "כלי AI",
  editing_design: "עריכה ועיצוב",
  software: "תוכנות",
  content_creation: "יצירת תוכן",
  coaching_tools: "כלי ליווי",
  education: "לימודים",
  skool: "Skool",
  other: "אחר",
};

const categoryColors: Record<string, string> = {
  meta_ads: "#ef4444",
  ai_tools: "#f59e0b",
  editing_design: "#8b5cf6",
  software: "#0c99e9",
  other: "#6b7280",
};

interface ExpenseBreakdownProps {
  byCategory: Record<string, number>;
}

export function ExpenseBreakdown({ byCategory }: ExpenseBreakdownProps) {
  const data = Object.entries(byCategory)
    .map(([key, value]) => ({
      name: categoryLabels[key] || key,
      value,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">הוצאות לפי קטגוריה</h3>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm">
        {data.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: categoryColors[item.key] || "#6b7280" }}
            />
            <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
            <span className="font-bold dark:text-gray-200">₪{item.value.toLocaleString("he-IL")}</span>
            {total > 0 && (
              <span className="text-gray-400 dark:text-gray-500">({Math.round((item.value / total) * 100)}%)</span>
            )}
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 40)}>
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
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
            {data.map((item) => (
              <Cell key={item.key} fill={categoryColors[item.key] || "#6b7280"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
