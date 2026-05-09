"use client";

import { useState, useEffect } from "react";
import { X, Send, Mail } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = "general" | "follow_up" | "onboarding" | "offer" | "check_in";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: Category;
}

interface Props {
  leadId: string;
  leadName: string;
  leadEmail: string;
  open: boolean;
  onClose: () => void;
  onSent?: () => void;
}

const CATEGORY_LABELS: Record<Category, string> = {
  general: "כללי",
  follow_up: "מעקב",
  onboarding: "קליטה",
  offer: "הצעה",
  check_in: "בדיקה",
};

// ── Variable substitution preview ─────────────────────────────────────────────

function applyVars(text: string, leadName: string): string {
  return text
    .replace(/\{\{lead_name\}\}/g, leadName)
    .replace(/\{\{sender_name\}\}/g, "Ben Levi");
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SendEmailModal({ leadId, leadName, leadEmail, open, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTpls, setLoadingTpls] = useState(false);

  // Load templates when modal opens
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setError(null);
    setSelectedId("");
    setLoadingTpls(true);
    fetch("/api/email-templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(() => setError("שגיאה בטעינת תבניות"))
      .finally(() => setLoadingTpls(false));
  }, [open]);

  const selected = templates.find((t) => t.id === selectedId);

  async function handleSend() {
    if (!selectedId) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: selectedId, to: leadEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה לא ידועה");
      setSent(true);
      onSent?.();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשליחה");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-100">שלח אימייל</span>
            <span className="text-xs text-zinc-500">→ {leadName}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Recipient */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">נמען</label>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400 font-mono" dir="ltr">
              {leadEmail}
            </div>
          </div>

          {/* Template picker */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">בחר תבנית</label>
            {loadingTpls ? (
              <div className="text-xs text-zinc-600 py-2">טוען תבניות...</div>
            ) : templates.length === 0 ? (
              <div className="text-xs text-zinc-600 py-2">
                אין תבניות — <a href="/settings" className="underline text-zinc-400">צור תבנית בהגדרות</a>
              </div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
              >
                <option value="">-- בחר תבנית --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({CATEGORY_LABELS[t.category]})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Preview */}
          {selected && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">נושא</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200">
                  {applyVars(selected.subject, leadName)}
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">תצוגה מקדימה</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {applyVars(selected.body, leadName)}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Success */}
          {sent && (
            <div className="bg-green-950/40 border border-green-800/50 rounded-lg px-3 py-2 text-sm text-green-400">
              האימייל נשלח בהצלחה
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedId || sending || sent}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={14} />
            {sending ? "שולח..." : sent ? "נשלח" : "שלח אימייל"}
          </button>
        </div>
      </div>
    </div>
  );
}
