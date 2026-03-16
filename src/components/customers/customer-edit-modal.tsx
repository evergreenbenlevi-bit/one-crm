"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Customer, CustomerStatus, ProductType } from "@/lib/types/database";

const statusOptions: { value: CustomerStatus; label: string }[] = [
  { value: "active", label: "פעיל בתוכנית" },
  { value: "completed", label: "סיים תוכנית" },
  { value: "churned", label: "נטש" },
];

const productOptions: { value: ProductType; label: string }[] = [
  { value: "freedom", label: "החופש לשווק" },
  { value: "simply_grow", label: "פשוט לצמוח" },
];

interface Props {
  customer: Customer;
  open: boolean;
  onClose: () => void;
}

export function CustomerEditModal({ customer, open, onClose }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: customer.name,
    email: customer.email || "",
    phone: customer.phone || "",
    occupation: customer.occupation || "",
    status: customer.status,
    products_purchased: customer.products_purchased || [],
    total_paid: customer.total_paid,
    current_month: customer.current_month,
    program_start_date: customer.program_start_date || "",
    program_end_date: customer.program_end_date || "",
  });

  if (!open) return null;

  function toggleProduct(product: ProductType) {
    setForm(prev => ({
      ...prev,
      products_purchased: prev.products_purchased.includes(product)
        ? prev.products_purchased.filter(p => p !== product)
        : [...prev.products_purchased, product],
    }));
  }

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
        status: form.status,
        products_purchased: form.products_purchased,
        total_paid: Number(form.total_paid),
        current_month: Number(form.current_month),
        program_start_date: form.program_start_date || null,
        program_end_date: form.program_end_date || null,
      };

      const res = await fetch(`/api/customers/${customer.id}`, {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold dark:text-gray-100">עריכת לקוח</h2>
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
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">טלפון</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* סטטוס */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">סטטוס</label>
            <select
              value={form.status}
              onChange={e => setForm(prev => ({ ...prev, status: e.target.value as CustomerStatus }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* מוצרים */}
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">מוצרים שרכש</label>
            <div className="flex gap-2">
              {productOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleProduct(opt.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    form.products_purchased.includes(opt.value)
                      ? "bg-brand-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* סכום ששולם + חודש נוכחי */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">סה״כ שילם (₪)</label>
              <input
                type="number"
                value={form.total_paid}
                onChange={e => setForm(prev => ({ ...prev, total_paid: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">חודש נוכחי</label>
              <input
                type="number"
                min="0"
                max="12"
                value={form.current_month}
                onChange={e => setForm(prev => ({ ...prev, current_month: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                dir="ltr"
              />
            </div>
          </div>

          {/* תאריכי תוכנית */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">תחילת תוכנית</label>
              <input
                type="date"
                value={form.program_start_date}
                onChange={e => setForm(prev => ({ ...prev, program_start_date: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">סיום תוכנית</label>
              <input
                type="date"
                value={form.program_end_date}
                onChange={e => setForm(prev => ({ ...prev, program_end_date: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
