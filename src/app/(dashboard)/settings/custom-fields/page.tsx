"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ChevronUp, ChevronDown, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface CustomField {
  id: string;
  entity_type: "lead" | "expense" | "task";
  field_name: string;
  field_label: string;
  field_type: "text" | "number" | "select" | "date" | "boolean";
  options_json: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const entityLabels: Record<string, string> = {
  lead: "לידים",
  expense: "הוצאות",
  task: "משימות",
};

const typeLabels: Record<string, string> = {
  text: "טקסט",
  number: "מספר",
  select: "בחירה",
  date: "תאריך",
  boolean: "כן/לא",
};

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formEntity, setFormEntity] = useState<string>("lead");
  const [formName, setFormName] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState<string>("text");
  const [formOptions, setFormOptions] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchFields = useCallback(async () => {
    const res = await fetch("/api/custom-fields");
    if (res.ok) setFields(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formLabel.trim() || saving) return;
    setSaving(true);

    const maxSort = fields.filter(f => f.entity_type === formEntity).reduce((m, f) => Math.max(m, f.sort_order), 0);

    const res = await fetch("/api/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity_type: formEntity,
        field_name: formName.trim(),
        field_label: formLabel.trim(),
        field_type: formType,
        options_json: formType === "select" ? formOptions.split(",").map(o => o.trim()).filter(Boolean) : null,
        sort_order: maxSort + 1,
      }),
    });

    if (res.ok) {
      setFormName(""); setFormLabel(""); setFormType("text"); setFormOptions("");
      setShowForm(false);
      fetchFields();
    }
    setSaving(false);
  }

  async function handleToggle(field: CustomField) {
    await fetch(`/api/custom-fields/${field.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !field.is_active }),
    });
    fetchFields();
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק שדה מותאם אישית? הערכים שנשמרו יימחקו גם.")) return;
    await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
    fetchFields();
  }

  async function handleReorder(field: CustomField, direction: "up" | "down") {
    const group = fields.filter(f => f.entity_type === field.entity_type).sort((a, b) => a.sort_order - b.sort_order);
    const idx = group.findIndex(f => f.id === field.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= group.length) return;

    const other = group[swapIdx];
    await Promise.all([
      fetch(`/api/custom-fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: other.sort_order }),
      }),
      fetch(`/api/custom-fields/${other.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: field.sort_order }),
      }),
    ]);
    fetchFields();
  }

  const grouped = (["lead", "expense", "task"] as const).map(type => ({
    type,
    label: entityLabels[type],
    items: fields.filter(f => f.entity_type === type).sort((a, b) => a.sort_order - b.sort_order),
  }));

  if (loading) {
    return <div className="text-gray-400 dark:text-gray-500 text-center py-20">טוען...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">שדות מותאמים אישית</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">הוסף שדות מותאמים ללידים, הוצאות ומשימות</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          <Plus size={16} /> שדה חדש
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ישות</label>
              <select value={formEntity} onChange={e => setFormEntity(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm">
                <option value="lead">לידים</option>
                <option value="expense">הוצאות</option>
                <option value="task">משימות</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">סוג שדה</label>
              <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm">
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">שם שדה (אנגלית)</label>
              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="custom_budget" dir="ltr" className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">תווית תצוגה</label>
              <input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="תקציב" className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm" />
            </div>
          </div>
          {formType === "select" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">אפשרויות (מופרדות בפסיק)</label>
              <input value={formOptions} onChange={e => setFormOptions(e.target.value)} placeholder="נמוך, בינוני, גבוה" className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">ביטול</button>
            <button type="submit" disabled={saving || !formName.trim() || !formLabel.trim()} className="px-4 py-2 rounded-xl text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors">
              {saving ? "שומר..." : "הוסף שדה"}
            </button>
          </div>
        </form>
      )}

      {/* Grouped fields */}
      {grouped.map(group => (
        <div key={group.type} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold dark:text-gray-100 mb-4">{group.label}</h2>
          {group.items.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">אין שדות מותאמים</p>
          ) : (
            <div className="space-y-2">
              {group.items.map((field, idx) => (
                <div key={field.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => handleReorder(field, "up")} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20"><ChevronUp size={14} /></button>
                      <button onClick={() => handleReorder(field, "down")} disabled={idx === group.items.length - 1} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20"><ChevronDown size={14} /></button>
                    </div>
                    <div>
                      <div className="text-sm font-medium dark:text-gray-200">{field.field_label}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{field.field_name} · {typeLabels[field.field_type]}{field.options_json ? ` (${(field.options_json as string[]).length} אפשרויות)` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggle(field)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {field.is_active ? <ToggleRight size={20} className="text-green-500" /> : <ToggleLeft size={20} />}
                    </button>
                    <button onClick={() => handleDelete(field.id)} className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
