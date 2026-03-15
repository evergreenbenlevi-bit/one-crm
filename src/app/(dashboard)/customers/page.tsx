import { getCustomers } from "@/lib/queries/customers";
import Link from "next/link";
import { Users, Phone, Mail } from "lucide-react";

const statusLabels: Record<string, string> = {
  active: "פעיל",
  completed: "סיים",
  churned: "נטש",
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  completed: "bg-gray-50 text-gray-700",
  churned: "bg-red-50 text-red-700",
};

const productLabels: Record<string, string> = {
  freedom: "החופש לשווק",
  simply_grow: "פשוט לצמוח",
};

export default async function CustomersPage() {
  const customers = await getCustomers();

  const activeCount = customers.filter(c => c.status === "active").length;
  const completedCount = customers.filter(c => c.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Users size={14} /> {customers.length} סה״כ</span>
          <span className="text-success">{activeCount} פעילים</span>
          <span>{completedCount} סיימו</span>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center text-gray-400">
          אין לקוחות עדיין
        </div>
      ) : (
        <div className="grid gap-3">
          {customers.map(customer => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <div className="font-medium">{customer.name}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    {customer.email && <span className="flex items-center gap-1"><Mail size={10} />{customer.email}</span>}
                    {customer.phone && <span className="flex items-center gap-1"><Phone size={10} />{customer.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {customer.products_purchased?.map((p: string) => (
                    <span key={p} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                      {productLabels[p] || p}
                    </span>
                  ))}
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full ${statusColors[customer.status] || "bg-gray-50 text-gray-700"}`}>
                  {statusLabels[customer.status] || customer.status}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  ₪{Number(customer.total_paid).toLocaleString("he-IL")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
