import { Phone, MessageCircle } from "lucide-react";
import type { Customer } from "@/lib/types/database";

const statusLabels: Record<string, string> = {
  active: "פעיל בתוכנית",
  completed: "סיים תוכנית",
  churned: "נטש",
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  churned: "bg-red-50 text-red-700",
};

const productLabels: Record<string, string> = {
  freedom: "החופש לשווק",
  simply_grow: "פשוט לצמוח",
};

export function CustomerCardHeader({ customer }: { customer: Customer }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xl">
            {customer.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{customer.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
              {customer.email && <span>{customer.email}</span>}
              {customer.phone && <span>{customer.phone}</span>}
              {customer.occupation && <span>· {customer.occupation}</span>}
            </div>
          </div>
        </div>

        <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[customer.status] || ""}`}>
          {statusLabels[customer.status] || customer.status}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        {customer.products_purchased?.map(p => (
          <span key={p} className="text-xs bg-brand-50 text-brand-700 px-3 py-1 rounded-full font-medium">
            {productLabels[p] || p}
          </span>
        ))}

        {customer.status === "active" && customer.current_month > 0 && (
          <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
            חודש {customer.current_month} מתוך 4
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-50 hover:bg-gray-100 transition-colors">
            <Phone size={16} /> התקשר
          </a>
        )}
        {customer.phone && (
          <a href={`https://wa.me/972${customer.phone.replace(/^0/, "")}`} target="_blank" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
            <MessageCircle size={16} /> וואטסאפ
          </a>
        )}
      </div>
    </div>
  );
}
