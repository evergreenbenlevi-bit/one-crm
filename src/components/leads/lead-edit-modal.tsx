"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Lead, LeadStatus, LeadSource, ProductType } from "@/lib/types/database";

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "חדש" },
  { value: "watched_vsl", label: "צפה בסרטון" },
  { value: "got_wa", label: "קיבל וואטסאפ" },
  { value: "filled_questionnaire", label: "מילא שאלון" },
  { value: "sales_call", label: "שיחת מכירה" },
  { value: "closed", label: "סגור" },
  { value: "lost", label: "אבוד" },
];

const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: "campaign", label: "קמפיין" },
  { value: "organic", label: "אורגני" },
  { value: "youtube", label: "יוטיוב" },
  { value: "referral", label: "הפניה" },
  { value: "other", label: "אחר" },
];

const productOptions: { value: ProductType; label: string }[] = [
  { value: "freedom", label: "החופש לשווק" },
  { value: "simply_grow", label: "פשוט לצמוח" },
];

interface Props {
  lead: Lead;
  open: boolean;
  onClose: () => void;
}

export function LeadEditModal({ lead, open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email || "",
    phone: lead.phone || "",
    occupation: lead.occupation || "",
    current_status: lead.current_status,
    source: lead.source,
    product: lead.product,
    ad_name: lead.ad_name || "",
    campaign_id: lead.campaign_id || "",
  });

  if (!open) return null;

  async function handleSave() {
    if (!form.name.trim()) {
      setError("שם הוא שדה חובה");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        occupation: form.occupation.trim() || null,
        current_status: form.current_status,
        source: form.source,
        product: form.product,
        ad_name: form.ad_name.trim() || null,
        campaign_id: form.campaign_id.trim() || null,
      };

      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-gray-100">עריכת ליד</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* שם */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">שם *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* אימייל + טלפון */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">אימייל</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                className={inputClass}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">טלפון</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>

          {/* עיסוק */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">עיסוק</label>
            <input
              type="text"
              value={form.occupation}
              onChange={e => setForm(prev => ({ ...prev, occupation: e.target.value }))}
              className={inputClass}
            />
          </div>

          {/* מוצר + מקור */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">מוצר</label>
              <select
                value={form.product}
                onChange={e => setForm(prev => ({ ...prev, product: e.target.value as ProductType }))}
                className={inputClass}
              >
                {productOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">מקור</label>
              <select
                value={form.source}
                onChange={e => setForm(prev => ({ ...prev, source: e.target.value as LeadSource }))}
                className={inputClass}
              >
                {sourceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* סטטוס */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">סטטוס</label>
            <select
              value={form.current_status}
              onChange={e => setForm(prev => ({ ...prev, current_status: e.target.value as LeadStatus }))}
              className={inputClass}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* מודעה + קמפיין */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">שם מודעה</label>
              <input
                type="text"
                value={form.ad_name}
                onChange={e => setForm(prev => ({ ...prev, ad_name: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">מזהה קמפיין</label>
              <input
                type="text"
                value={form.campaign_id}
                onChange={e => setForm(prev => ({ ...prev, campaign_id: e.target.value }))}
                className={inputClass}
                dir="ltr"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "שומר..." : "שמור שינויים"}
          </button>
        </div>
      </div>
    </div>
  );
}
