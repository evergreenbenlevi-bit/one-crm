"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Check, Mail } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = "general" | "follow_up" | "onboarding" | "offer" | "check_in";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: Category;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<Category, string> = {
  general: "כללי",
  follow_up: "מעקב",
  onboarding: "קליטה",
  offer: "הצעה",
  check_in: "בדיקה",
};

const CATEGORIES: Category[] = ["general", "follow_up", "onboarding", "offer", "check_in"];

// ── Empty form ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  subject: "",
  body: "",
  category: "general" as Category,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TemplateForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (vals: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [vals, setVals] = useState(initial);

  const set = (k: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setVals((v) => ({ ...v, [k]: e.target.value }));

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">שם תבנית</label>
        <input
          value={vals.name}
          onChange={set("name")}
          placeholder="למשל: ברוכים הבאים"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">קטגוריה</label>
        <select
          value={vals.category}
          onChange={set("category")}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">נושא</label>
        <input
          value={vals.subject}
          onChange={set("subject")}
          placeholder="נושא האימייל — ניתן להשתמש ב-{{lead_name}}"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Body */}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">
          גוף ההודעה{" "}
          <span className="text-zinc-600">— משתנים: {`{{lead_name}}, {{sender_name}}`}</span>
        </label>
        <textarea
          value={vals.body}
          onChange={set("body")}
          rows={8}
          placeholder={"שלום {{lead_name}},\n\n..."}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-y font-mono"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <X size={14} /> ביטול
        </button>
        <button
          onClick={() => onSave(vals)}
          disabled={saving || !vals.name.trim() || !vals.subject.trim() || !vals.body.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Check size={14} /> {saving ? "שומר..." : "שמור"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EmailTemplatesManager({
  initialTemplates,
}: {
  initialTemplates: EmailTemplate[];
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // ── Create ──
  async function handleCreate(vals: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vals, body: vals.body }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created: EmailTemplate = await res.json();
      setTemplates((prev) => [created, ...prev]);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  // ── Update ──
  async function handleUpdate(id: string, vals: typeof EMPTY_FORM) {
    setSaving(true);
    try {
      const res = await fetch(`/api/email-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...vals, body: vals.body }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: EmailTemplate = await res.json();
      setTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──
  async function handleDelete(id: string, name: string) {
    if (!confirm(`למחוק את התבנית "${name}"?`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/email-templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">תבניות אימייל</h2>
          <span className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
            {templates.length}
          </span>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            <Plus size={14} /> תבנית חדשה
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <TemplateForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onCancel={() => setAdding(false)}
          saving={saving}
        />
      )}

      {/* Template list */}
      <div className="space-y-2">
        {templates.length === 0 && !adding && (
          <div className="text-center py-10 text-zinc-600 text-sm">
            אין תבניות עדיין — צור את הראשונה
          </div>
        )}

        {templates.map((t) =>
          editingId === t.id ? (
            <TemplateForm
              key={t.id}
              initial={{ name: t.name, subject: t.subject, body: t.body, category: t.category }}
              onSave={(vals) => handleUpdate(t.id, vals)}
              onCancel={() => setEditingId(null)}
              saving={saving}
            />
          ) : (
            <div
              key={t.id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-start justify-between gap-3 hover:border-zinc-700 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-zinc-100 truncate">{t.name}</span>
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full flex-shrink-0">
                    {CATEGORY_LABELS[t.category]}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 truncate">{t.subject}</div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditingId(t.id)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  disabled={deleting === t.id}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-950/30 disabled:opacity-40 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
