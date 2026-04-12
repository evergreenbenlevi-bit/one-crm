"use client";

import { useState } from "react";
import { Users, Zap, Youtube } from "lucide-react";
import MyCreatorsView from "./my-creators/MyCreatorsView";
import ViralView from "./viral/ViralView";
import BenPerformanceSection from "./BenPerformanceSection";

const TABS = [
  { key: "my", label: "My Creators", icon: Users },
  { key: "viral", label: "Global Viral", icon: Zap },
  { key: "ben", label: "ביצועי בן", icon: Youtube },
];

export default function CreatorIntelPage() {
  const [tab, setTab] = useState("my");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Creator Intel</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Intelligence loop — observe → learn → create
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-gray-900 dark:border-white text-gray-900 dark:text-white"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "my" && <MyCreatorsView />}
      {tab === "viral" && <ViralView />}
      {tab === "ben" && <BenPerformanceSection />}
    </div>
  );
}
