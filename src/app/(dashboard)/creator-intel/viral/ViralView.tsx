"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Zap, RefreshCw } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { ViralCard } from "./ViralCard";
import type { ViralScan } from "./ViralCard";

const NICHE_TABS = [
  { key: "all", label: "הכל" },
  { key: "ai_creator", label: "AI" },
  { key: "business_coach", label: "Business" },
  { key: "confessional", label: "Manifesto" },
];

const PLATFORM_TABS = [
  { key: "all", label: "All" },
  { key: "youtube", label: "YouTube" },
  { key: "instagram", label: "Instagram" },
];

export default function ViralView() {
  const [niche, setNiche] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [lifetime, setLifetime] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const params = new URLSearchParams({ action: "none", limit: "50" });
  if (niche !== "all")    params.set("niche", niche);
  if (platform !== "all") params.set("platform", platform);
  if (lifetime)           params.set("lifetime", "true");

  const { data: scans, isLoading, mutate } = useSWR<ViralScan[]>(
    `/api/viral-feed?${params}&k=${refreshKey}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  async function handleAction(id: string, action: "saved" | "repurpose" | "dismiss") {
    await fetch("/api/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    // Optimistic: remove from list
    mutate((prev) => (prev ?? []).filter((s) => s.id !== id), false);
  }

  const hasData = scans && scans.length > 0;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* Niche filter */}
        <div className="flex gap-1 flex-wrap">
          {NICHE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setNiche(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                niche === t.key
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Lifetime toggle */}
          <button
            onClick={() => setLifetime((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              lifetime
                ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Lifetime Top
          </button>

          {/* Platform filter */}
          <div className="flex gap-1">
            {PLATFORM_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setPlatform(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  platform === t.key
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <div className="text-center py-24 text-gray-400">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">אין תוצאות ויראליות עדיין</p>
          <p className="text-xs mt-1 text-gray-400">
            הרץ <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-[11px]">scan_viral_global.py</code> כדי לאכלס
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">{scans.length} posts — sorted by viral score</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {scans.map((scan) => (
              <ViralCard key={scan.id} scan={scan} onAction={handleAction} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
