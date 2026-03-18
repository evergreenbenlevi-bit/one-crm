"use client";

import { useState, useEffect, useCallback } from "react";
import { ContentTable } from "@/components/content/content-table";
import { clsx } from "clsx";

interface ContentMetric {
  id: string;
  platform: string;
  title: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  leads_generated: number;
}

const platformFilters = [
  { key: "all", label: "הכל" },
  { key: "instagram", label: "אינסטגרם" },
  { key: "linkedin", label: "לינקדאין" },
  { key: "youtube", label: "יוטיוב" },
  { key: "tiktok", label: "טיקטוק" },
];

export default function ContentPage() {
  const [data, setData] = useState<ContentMetric[]>([]);
  const [platform, setPlatform] = useState("all");
  const [sortBy, setSortBy] = useState("published_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (platform !== "all") params.set("platform", platform);
    params.set("sort_by", sortBy);
    params.set("sort_dir", sortDir);

    const res = await fetch(`/api/content-metrics?${params}`);
    const json = await res.json();
    setData(Array.isArray(json) ? json : []);
    setLoading(false);
  }, [platform, sortBy, sortDir]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-gray-100">ביצועי תוכן</h1>

      <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
        {platformFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setPlatform(f.key)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              platform === f.key
                ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">טוען...</div>
      ) : (
        <ContentTable data={data} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
      )}
    </div>
  );
}
