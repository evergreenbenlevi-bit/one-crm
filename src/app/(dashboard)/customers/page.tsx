"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Phone, Mail, Search, Plus } from "lucide-react";
import { CustomerAddModal } from "@/components/customers/customer-add-modal";

const statusLabels: Record<string, string> = {
  active: "פעיל",
  completed: "סיים",
  churned: "נטש",
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  completed: "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  churned: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const productLabels: Record<string, string> = {
  one_core: "ONE™ Core",
  one_vip: "ONE™ VIP",
};

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  status: string;
  products_purchased: string[];
  total_paid: number;
  program: string | null;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  function loadCustomers() {
    setLoading(true);
    fetch("/api/customers")
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); });
  }

  useEffect(() => { loadCustomers(); }, []);

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email?.toLowerCase().includes(search.toLowerCase())) ||
      (c.phone?.includes(search));
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = customers.filter(c => c.status === "active").length;
  const completedCount = customers.filter(c => c.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">לקוחות</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1"><Users size={13} /> {customers.length} סה״כ</span>
            <span className="text-success">{activeCount} פעילים</span>
            <span>{completedCount} סיימו</span>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus size={16} /> הוסף לקוח
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לקוח..."
            className="w-full pr-9 pl-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
          {[{k:"all",l:"הכל"},{k:"active",l:"פעיל"},{k:"completed",l:"סיים"},{k:"churned",l:"נטש"}].map(t => (
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

      {loading ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">טוען...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 text-center text-gray-400 dark:text-gray-500">
          {search ? "לא נמצאו לקוחות" : "אין לקוחות עדיין"}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(customer => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium dark:text-gray-200">{customer.name}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {customer.email && <span className="flex items-center gap-1"><Mail size={10} />{customer.email}</span>}
                    {customer.phone && <span className="flex items-center gap-1"><Phone size={10} />{customer.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {(customer.products_purchased?.length ? customer.products_purchased : customer.program ? [customer.program] : []).map((p: string) => (
                    <span key={p} className="text-xs bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full">
                      {productLabels[p] || p}
                    </span>
                  ))}
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusColors[customer.status] || "bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}>
                  {statusLabels[customer.status] || customer.status}
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ₪{Number(customer.total_paid).toLocaleString("he-IL")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CustomerAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={loadCustomers}
      />
    </div>
  );
}
