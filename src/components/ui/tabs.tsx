"use client";

import { clsx } from "clsx";

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            activeTab === tab.key
              ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
