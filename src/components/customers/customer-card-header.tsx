"use client";

import { useState } from "react";
import { Phone, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types/database";
import { CustomerEditModal } from "./customer-edit-modal";

const statusLabels: Record<string, string> = {
  active: "פעיל בתוכנית",
  completed: "סיים תוכנית",
  churned: "נטש",
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  completed: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400",
  churned: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const productLabels: Record<string, string> = {
  one_core: "ONE™ Core",
  one_vip: "ONE™ VIP",
};

export function CustomerCardHeader({ customer }: { customer: Customer }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`למחוק את הלקוח "${customer.name}"? פעולה בלתי הפיכה.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
    if (res.ok) router.push("/customers");
    else setDeleting(false);
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xl">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold dark:text-gray-100">{customer.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                {customer.email && <span>{customer.email}</span>}
                {customer.phone && <span>{customer.phone}</span>}
                {customer.occupation && <span>· {customer.occupation}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
            >
              <Pencil size={16} /> עריכה
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={16} /> {deleting ? "מוחק..." : "מחיקה"}
            </button>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[customer.status] || ""}`}>
              {statusLabels[customer.status] || customer.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {customer.products_purchased?.map(p => (
            <span key={p} className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full font-medium">
              {productLabels[p] || p}
            </span>
          ))}

          {customer.status === "active" && customer.current_month > 0 && (
            <span className="text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full">
              חודש {customer.current_month} מתוך 4
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors dark:text-gray-200">
              <Phone size={16} /> התקשר
            </a>
          )}
          {customer.phone && (
            <a href={`https://wa.me/972${customer.phone.replace(/^0/, "")}`} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
              <MessageCircle size={16} /> וואטסאפ
            </a>
          )}
        </div>
      </div>

      <CustomerEditModal customer={customer} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  );
}
