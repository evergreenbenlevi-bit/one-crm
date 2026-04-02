"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Loader2, Trash2, Clock } from "lucide-react";
import { clsx } from "clsx";

interface DumpResult {
  text: string;
  type: "task" | "idea" | "reminder" | "note";
  title: string;
  destination: string;
  due_date: string | null;
}

interface DumpHistoryEntry {
  id: string;
  text: string;
  timestamp: string;
  itemCount: number;
}

const TYPE_CONFIG = {
  task: { icon: "\u{1F4CB}", label: "CRM", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  idea: { icon: "\u{1F4A1}", label: "vault", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  reminder: { icon: "\u23F0", label: "CRM + date", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800" },
  note: { icon: "\u{1F4DD}", label: "vault", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
  system: { icon: "\u2699\uFE0F", label: "vault", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800" },
};

const HISTORY_KEY = "one-crm-brain-dumps";
const MAX_HISTORY = 20;

function loadHistory(): DumpHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: DumpHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

export default function BrainDumpPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DumpResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DumpHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setResults(data.items);

      // Save to history
      const entry: DumpHistoryEntry = {
        id: crypto.randomUUID(),
        text: text.slice(0, 200),
        timestamp: new Date().toISOString(),
        itemCount: data.items.length,
      };
      const updated = [entry, ...loadHistory()].slice(0, MAX_HISTORY);
      saveHistory(updated);
      setHistory(updated);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setText("");
    setResults(null);
    setError(null);
    textareaRef.current?.focus();
  }

  function clearHistory() {
    saveHistory([]);
    setHistory([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Brain className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Brain Dump</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              פרוק מחשבות &rarr; Claude מסווג &rarr; CRM / Vault
            </p>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 mb-6">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={6}
          placeholder="פרוק מחשבות פה... כל מה שעולה לך"
          disabled={loading}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 disabled:opacity-50 leading-relaxed"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
              className={clsx(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm",
                loading || !text.trim()
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-700 text-white active:scale-[0.97]"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>מסווג...</span>
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  <span>{"🧠 סדר לי את זה"}</span>
                </>
              )}
            </button>

            {(results || text) && !loading && (
              <button
                onClick={handleClear}
                className="px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                נקה
              </button>
            )}
          </div>

          <span className="text-xs text-gray-400 dark:text-gray-500">
            ⌘+Enter לשליחה
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading animation */}
      {loading && (
        <div className="mb-6 flex flex-col items-center justify-center gap-3 py-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-10 h-10 text-violet-400" />
          </motion.div>
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Claude קורא את המחשבות שלך...
          </p>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {results && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {results.length} פריטים סווגו
              </h2>
              <div className="flex gap-2">
                {(["task", "reminder", "idea", "note"] as const).map((t) => {
                  const count = results.filter((r) => r.type === t).length;
                  if (!count) return null;
                  const cfg = TYPE_CONFIG[t];
                  return (
                    <span key={t} className={clsx("text-xs px-2 py-1 rounded-full font-medium", cfg.color, cfg.bg.split(" ")[0])}>
                      {cfg.icon} {count}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              {results.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={clsx(
                      "flex items-start gap-3 px-4 py-3 rounded-xl border",
                      cfg.bg
                    )}
                  >
                    <span className="text-lg mt-0.5">{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {item.title}
                        </span>
                        <span className={clsx("text-xs font-medium", cfg.color)}>
                          {item.destination} ✅
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {item.text}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mb-3"
          >
            <Clock className="w-4 h-4" />
            <span>היסטוריה ({history.length})</span>
          </button>

          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm"
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {new Date(entry.timestamp).toLocaleDateString("he-IL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                    {entry.text}
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {entry.itemCount} items
                  </span>
                </div>
              ))}

              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 transition-colors mt-2"
              >
                <Trash2 className="w-3 h-3" />
                נקה היסטוריה
              </button>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
