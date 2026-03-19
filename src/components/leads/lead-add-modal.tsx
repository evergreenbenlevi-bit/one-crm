"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { LeadSource, ProgramType } from "@/lib/types/database";

const sourceOptions: { value: LeadSource; label: string }[] = [
  { value: "campaign", label: "קמפיין" },
  { value: "organic", label: "אורגני" },
  { value: "youtube", label: "יוטיוב" },
  { value: "referral", label: "הפניה" },
  { value: "instagram", label: "אינסטגרם" },
  { value: "linkedin", label: "לינקדאין" },
  { value: "content", label: "תוכן" },
  { value: "webinar", label: "וובינר" },
  { value: "skool", label: "Skool" },
  { value: "other", label: "אחר" },
];

const programOptions: { value: ProgramType; label: string }[] = [
  { value: "one_vip", label: "ONE™ VIP" },
  { value: "one_core", label: "ONE™ Core" },
];

interface DuplicateLead { id: string; name: string; phone: string | null; email: string | null; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  defaultProgram?: ProgramType;
}

export function LeadAddModal({ open, onClose, onCreated, defaultProgram = "one_vip" }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateLead[]>([]);
  const [forceCreate, setForceCreate] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "", occupation: "",
    source: "organic" as LeadSource, program: defaultProgram,
    ad_name: "", campaign_id: "",
  });

  if (!open) return null;

  function reset() {
    setForm({ name: "", email: "", phone: "", occupation: "", source: "organic", program: defaultProgram, ad_name: "", campaign_id: "" });
    setError("");
    setDuplicates([]);
    setForceCreate(false);
  }

  function handleClose() { reset(); onClose(); }

  async function checkDuplicates(): Promise<DuplicateLead[]> {
    const found: DuplicateLead[] = [];
    const checks: Promise<void>[] = [];

    if (form.phone.trim()) {
      checks.push(
        fetch(`/api/leads?search=${encodeURIComponent(form.phone.trim())}`)
          .then(r => r.json())
          .then((data: DuplicateLead[]) => { if (Array.isArray(data)) found.push(...data); })
      );
    }
    if (form.email.trim()) {
      checks.push(
        fetch(`/api/leads?search=${encodeURIComponent(form.email.trim())}`)
          .then(r => r.json())
          .then((data: DuplicateLead[]) => { if (Array.isArray(data)) found.push(...data); })
      );
    }

    await Promise.all(checks);

    // Deduplicate by id
    const unique = found.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
    return unique;
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("שם הוא שדה חובה"); return; }

    setSaving(true);
    setError("");

    try {
      // Check duplicates first (skip if user already confirmed)
      if (!forceCreate) {
        const found = await checkDuplicates();
        if (found.length > 0) {
          setDuplicates(found);
          setSaving(false);
          return; // Stop — show warning
        }
      }

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה ביצירה");
      }

      reset();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירה");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-gray-100">הוספת ליד חדש</h2>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl">{error}</div>
          )}

          {/* Duplicate warning */}
          {duplicates.length > 0 && !forceCreate && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">נמצאו לידים דומים</span>
              </div>
              <div className="space-y-1 mb-3">
                {duplicates.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <Link href={`/leads/${d.id}`} target="_blank" className="font-medium hover:underline">{d.name}</Link>
                    {d.phone && <span className="text-xs opacity-70">{d.phone}</span>}
                    {d.email && <span className="text-xs opacity-70">{d.email}</span>}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setForceCreate(true); handleSave(); }}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  צור בכל זאת
                </button>
                <button
                  onClick={() => setDuplicates([])}
                  className="px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">שם *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">אימייל</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">טלפון</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputClass} dir="ltr" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">עיסוק</label>
            <input type="text" value={form.occupation} onChange={e => setForm(p => ({ ...p, occupation: e.target.value }))} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">תוכנית</label>
              <select value={form.program} onChange={e => setForm(p => ({ ...p, program: e.target.value as ProgramType }))} className={inputClass}>
                {programOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">מקור</label>
              <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value as LeadSource }))} className={inputClass}>
                {sourceOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">שם מודעה</label>
              <input type="text" value={form.ad_name} onChange={e => setForm(p => ({ ...p, ad_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">מזהה קמפיין</label>
              <input type="text" value={form.campaign_id} onChange={e => setForm(p => ({ ...p, campaign_id: e.target.value }))} className={inputClass} dir="ltr" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-700">
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            ביטול
          </button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
            {saving ? "בודק..." : "הוסף ליד"}
          </button>
        </div>
      </div>
    </div>
  );
}
