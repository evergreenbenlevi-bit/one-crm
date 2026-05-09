"use client";

import { useState } from "react";
import useSWR from "swr";
import { FileText, Search, Plus, Send, ExternalLink, CheckCircle2, Clock, Eye, XCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(r => r.json());

const STATUS_LABELS: Record<string, string> = {
  draft: "טיוטה",
  sent: "נשלח",
  viewed: "נצפה",
  signed: "חתום",
  rejected: "נדחה",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
  sent: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
  viewed: "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
  signed: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
  rejected: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  draft: FileText,
  sent: Send,
  viewed: Eye,
  signed: CheckCircle2,
  rejected: XCircle,
};

interface Proposal {
  id: string;
  title: string;
  program: string | null;
  amount: number | null;
  status: string;
  created_at: string;
  expires_at: string | null;
  docuseal_submission_id: string | null;
  leads: { name: string; email: string | null; phone: string | null } | null;
  customers: { name: string; email: string | null } | null;
}

export default function ProposalsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sending, setSending] = useState<string | null>(null);
  const [signingUrls, setSigningUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, mutate } = useSWR<Proposal[]>("/api/proposals", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const proposals = data ?? [];

  const filtered = proposals.filter(p => {
    const contact = p.leads ?? p.customers;
    const matchSearch = !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      contact?.name.toLowerCase().includes(search.toLowerCase()) ||
      contact?.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: proposals.length,
    draft: proposals.filter(p => p.status === "draft").length,
    sent: proposals.filter(p => p.status === "sent").length,
    signed: proposals.filter(p => p.status === "signed").length,
  };

  async function handleSend(proposal: Proposal) {
    setError(null);
    setSending(proposal.id);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/send-for-signing`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בשליחה");
      setSigningUrls(prev => ({ ...prev, [proposal.id]: json.signing_url }));
      await mutate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">הצעות מחיר</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><FileText size={13} /> {counts.all} סה״כ</span>
            {counts.draft > 0 && <span>{counts.draft} טיוטות</span>}
            {counts.sent > 0 && <span className="text-blue-500">{counts.sent} נשלחו</span>}
            {counts.signed > 0 && <span className="text-green-500">{counts.signed} חתומות</span>}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש הצעה..."
            className="w-full pr-9 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit flex-wrap">
          {[
            { k: "all", l: "הכל" },
            { k: "draft", l: "טיוטה" },
            { k: "sent", l: "נשלח" },
            { k: "viewed", l: "נצפה" },
            { k: "signed", l: "חתום" },
            { k: "rejected", l: "נדחה" },
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setStatusFilter(t.k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === t.k ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500">
          {search || statusFilter !== "all" ? "לא נמצאו הצעות" : "אין הצעות מחיר עדיין"}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(proposal => {
            const contact = proposal.leads ?? proposal.customers;
            const StatusIcon = STATUS_ICONS[proposal.status] ?? FileText;
            const signingUrl = signingUrls[proposal.id];

            return (
              <div
                key={proposal.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <StatusIcon size={18} className="text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium dark:text-gray-200 truncate">{proposal.title}</div>
                      {contact && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{contact.name}</div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500 flex-wrap">
                        {proposal.amount && (
                          <span className="font-medium text-gray-600 dark:text-gray-300">
                            ₪{Number(proposal.amount).toLocaleString("he-IL")}
                          </span>
                        )}
                        {proposal.program && <span>{proposal.program}</span>}
                        <span>{new Date(proposal.created_at).toLocaleDateString("he-IL")}</span>
                        {proposal.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(proposal.expires_at).toLocaleDateString("he-IL")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: status + action */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[proposal.status] ?? STATUS_COLORS.draft}`}>
                      {STATUS_LABELS[proposal.status] ?? proposal.status}
                    </span>
                    {proposal.status === "draft" && (
                      <button
                        onClick={() => handleSend(proposal)}
                        disabled={sending === proposal.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sending === proposal.id ? (
                          <span>שולח...</span>
                        ) : (
                          <>
                            <Send size={12} /> שלח לחתימה
                          </>
                        )}
                      </button>
                    )}
                    {proposal.docuseal_submission_id && proposal.status !== "draft" && (
                      <a
                        href={`${process.env.NEXT_PUBLIC_DOCUSEAL_URL ?? "http://localhost:3002"}/submissions/${proposal.docuseal_submission_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                        <ExternalLink size={13} /> DocuSeal
                      </a>
                    )}
                  </div>
                </div>

                {/* Signing URL — shown after sending */}
                {signingUrl && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">לינק לחתימה:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-blue-700 dark:text-blue-300 break-all flex-1">{signingUrl}</code>
                      <a
                        href={signingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
