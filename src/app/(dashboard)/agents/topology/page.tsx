"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { AgentTopologyGraph } from "@/components/agents/agent-topology-graph";
import { Loader2 } from "lucide-react";
import type { TopologyData } from "@/lib/types/agents";

export default function TopologyPage() {
  const { data, isLoading, error } = useSWR<TopologyData>("/api/agents/topology", fetcher, {
    refreshInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-red-400">שגיאה בטעינת טופולוגיה</p>
      </div>
    );
  }

  if (data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">אין נתונים להצגה</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">טופולוגיית מערכת</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {data.nodes.length} רכיבים &middot; {data.edges.length} חיבורים
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-6 h-0.5 bg-blue-500 inline-block" /> dispatches
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-0.5 bg-green-500 inline-block border-dashed border-t-2 border-green-500" style={{ background: "none" }} /> uses skill
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-0.5 bg-orange-500 inline-block" style={{ borderTop: "2px dotted #f97316", background: "none" }} /> triggers cron
          </span>
        </div>
      </div>
      <AgentTopologyGraph data={data} />
    </div>
  );
}
