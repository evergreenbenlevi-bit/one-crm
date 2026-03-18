"use client";

import { useState, useEffect, useCallback } from "react";
import { ApplicationCard } from "@/components/applications/application-card";
import { clsx } from "clsx";

interface Application {
  id: string;
  lead_id: string;
  status: string;
  answers: Record<string, string>;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  leads?: {
    name: string;
    email: string | null;
    phone: string | null;
    occupation: string | null;
  };
}

const filterTabs = [
  { key: "all", label: "הכל" },
  { key: "pending", label: "ממתינים" },
  { key: "approved", label: "אושרו" },
  { key: "rejected", label: "נדחו" },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    const res = await fetch(`/api/applications?${params}`);
    const data = await res.json();
    setApplications(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleStatusUpdate(id: string, status: "approved" | "rejected") {
    // Optimistic update
    setApplications(prev =>
      prev.map(app => app.id === id ? { ...app, status } : app)
    );

    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    approved: applications.filter(a => a.status === "approved").length,
    rejected: applications.filter(a => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold dark:text-gray-100">בקשות הצטרפות</h1>

      <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === tab.key
                ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            {tab.label}
            <span className="mr-1.5 text-xs text-gray-400 dark:text-gray-500">
              {counts[tab.key as keyof typeof counts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">טוען...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">אין בקשות להצגה</div>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <ApplicationCard
              key={app.id}
              application={app}
              onApprove={(id) => handleStatusUpdate(id, "approved")}
              onReject={(id) => handleStatusUpdate(id, "rejected")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
