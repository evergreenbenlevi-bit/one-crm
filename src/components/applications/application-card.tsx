"use client";

import { clsx } from "clsx";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

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

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  approved: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  approved: "אושר",
  rejected: "נדחה",
};

interface ApplicationCardProps {
  application: Application;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ApplicationCard({ application, onApprove, onReject }: ApplicationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const lead = application.leads;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{lead?.name || "—"}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{lead?.email || "—"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={clsx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", statusStyles[application.status] || statusStyles.pending)}>
            {statusLabels[application.status] || application.status}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(application.created_at).toLocaleDateString("he-IL")}
          </span>
        </div>
      </div>

      {lead?.occupation && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">תחום: {lead.occupation}</p>
      )}

      {application.status === "pending" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onApprove(application.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 transition-colors"
          >
            <Check size={14} />
            אשר
          </button>
          <button
            onClick={() => onReject(application.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
          >
            <X size={14} />
            דחה
          </button>
        </div>
      )}

      {application.answers && Object.keys(application.answers).length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "הסתר תשובות" : "הצג תשובות"}
          </button>

          {expanded && (
            <div className="mt-2 space-y-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
              {Object.entries(application.answers).map(([question, answer]) => (
                <div key={question}>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{question}</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{answer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
