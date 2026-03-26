"use client";

import { useState, useEffect, useCallback } from "react";
import { Lightbulb, BarChart3, Plus, Film, Youtube, Sparkles, X } from "lucide-react";
import { clsx } from "clsx";

// ─── Types ───────────────────────────────────────────────────
interface ContentIdea {
  id: string;
  title: string;
  type: "short_form" | "long_form" | "inspiration";
  status: string;
  platform: string | null;
  format: string | null;
  notes: string | null;
  reference_url: string | null;
  tags: string[] | null;
  sort_order: number;
}

// ─── Constants ───────────────────────────────────────────────
const TYPE_TABS = [
  { key: "short_form", label: "Short Form", icon: Film },
  { key: "long_form", label: "Long Form", icon: Youtube },
  { key: "inspiration", label: "השראות", icon: Sparkles },
] as const;

const STATUS_LABELS: Record<string, string> = {
  idea: "רעיון",
  working: "בתהליך",
  scripted: "יש סקריפט",
  filmed: "צולם",
  published: "פורסם",
  parked: "לא עכשיו",
};

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  working: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  scripted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  filmed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  parked: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const STATUS_FILTERS = ["all", "idea", "working", "scripted", "filmed", "published", "parked"];

// ─── Add Modal ───────────────────────────────────────────────
function AddIdeaModal({
  type,
  onClose,
  onSave,
}: {
  type: string;
  onClose: () => void;
  onSave: (idea: Partial<ContentIdea>) => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [format, setFormat] = useState("");
  const [platform, setPlatform] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">רעיון חדש</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            placeholder="כותרת *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            placeholder="הערות"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          {type === "long_form" && (
            <select
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="">בחר פורמט</option>
              <option value="long (15-30)">YouTube 15-30 דקות</option>
              <option value="long (30-60)">YouTube 30-60 דקות</option>
              <option value="series">סדרה</option>
              <option value="documentary">דוקומנטרי</option>
            </select>
          )}
          {type === "inspiration" && (
            <>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="">בחר פלטפורמה</option>
                <option value="youtube">YouTube</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="tiktok">TikTok</option>
              </select>
              <input
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                placeholder="לינק השראה"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
              />
            </>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              if (!title.trim()) return;
              onSave({
                title: title.trim(),
                type: type as ContentIdea["type"],
                status: "idea",
                notes: notes || null,
                format: format || null,
                platform: platform || null,
                reference_url: referenceUrl || null,
              });
            }}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg text-sm font-medium"
          >
            הוסף
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function ContentPage() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string>("short_form");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("type", activeType);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/content-ideas?${params}`);
    if (res.ok) setIdeas(await res.json());
    setLoading(false);
  }, [activeType, statusFilter]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/content-ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchIdeas();
  };

  const addIdea = async (idea: Partial<ContentIdea>) => {
    await fetch("/api/content-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(idea),
    });
    setShowAdd(false);
    fetchIdeas();
  };

  const deleteIdea = async (id: string) => {
    await fetch("/api/content-ideas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchIdeas();
  };

  const counts = Object.fromEntries(
    ["idea", "working", "scripted", "filmed", "published"].map((s) => [
      s,
      ideas.filter((i) => i.status === s).length,
    ])
  );

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">תוכן</h1>
          <span className="text-sm text-gray-500 mr-2">admin only</span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          רעיון חדש
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit mb-6">
        {TYPE_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setActiveType(key); setStatusFilter("all"); }}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeType === key
                ? "bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-gray-100"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { key: "idea", label: "רעיונות", color: "text-yellow-600" },
          { key: "working", label: "בתהליך", color: "text-blue-600" },
          { key: "scripted", label: "סקריפט", color: "text-purple-600" },
          { key: "filmed", label: "צולם", color: "text-indigo-600" },
          { key: "published", label: "פורסם", color: "text-green-600" },
        ].map(({ key, label, color }) => (
          <div
            key={key}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-400 transition-colors"
            onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
          >
            <div className={clsx("text-2xl font-bold", color)}>{counts[key] ?? 0}</div>
            <div className="text-sm text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-1 mb-6">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={clsx(
              "px-3 py-1 rounded-full text-sm transition-colors",
              statusFilter === s
                ? "bg-amber-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
            )}
          >
            {s === "all" ? "הכל" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Ideas Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-right px-4 py-3 font-medium text-gray-500 w-8">#</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">כותרת</th>
                {activeType === "long_form" && (
                  <th className="text-right px-4 py-3 font-medium text-gray-500">פורמט</th>
                )}
                {activeType === "inspiration" && (
                  <th className="text-right px-4 py-3 font-medium text-gray-500">פלטפורמה</th>
                )}
                <th className="text-right px-4 py-3 font-medium text-gray-500">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">הערות</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {ideas.map((idea, idx) => (
                <tr
                  key={idea.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{idea.title}</td>
                  {activeType === "long_form" && (
                    <td className="px-4 py-3 text-gray-500 text-xs">{idea.format || "—"}</td>
                  )}
                  {activeType === "inspiration" && (
                    <td className="px-4 py-3 text-gray-500 text-xs capitalize">{idea.platform || "—"}</td>
                  )}
                  <td className="px-4 py-3">
                    <select
                      value={idea.status}
                      onChange={(e) => updateStatus(idea.id, e.target.value)}
                      className={clsx(
                        "text-xs px-2 py-1 rounded-full border-0 cursor-pointer font-medium",
                        STATUS_COLORS[idea.status]
                      )}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {idea.notes || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteIdea(idea.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="מחק"
                    >
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ideas.length === 0 && (
            <div className="text-center py-12 text-gray-400">אין רעיונות להצגה</div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <AddIdeaModal
          type={activeType}
          onClose={() => setShowAdd(false)}
          onSave={addIdea}
        />
      )}
    </div>
  );
}
