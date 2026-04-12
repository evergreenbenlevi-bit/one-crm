"use client";

import type { Customer } from "@/lib/types/database";

interface Props {
  customer: Customer;
}

export function InstallmentSchedule({ customer }: Props) {
  const count = customer.installment_count || 1;
  const totalPaid = Number(customer.total_paid) || 0;
  const amountPerInstallment = count > 0 ? totalPaid / count : totalPaid;
  const paidCount = customer.installment_number || 1;
  const startDate = customer.program_start_date ? new Date(customer.program_start_date) : null;

  const rows = Array.from({ length: count }, (_, i) => {
    const installmentNum = i + 1;
    const isPaid = installmentNum <= paidCount;

    let dueDate: string | null = null;
    if (startDate) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      dueDate = d.toLocaleDateString("he-IL");
    }

    return { installmentNum, amount: amountPerInstallment, dueDate, isPaid };
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="font-medium dark:text-gray-200 mb-4">לוח תשלומים</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 dark:text-gray-500">מס׳ תשלום</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 dark:text-gray-500">סכום</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 dark:text-gray-500">תאריך יעד</th>
              <th className="text-right py-2 px-3 text-xs font-medium text-gray-400 dark:text-gray-500">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.installmentNum} className="border-b border-gray-50 dark:border-gray-700/50">
                <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">#{row.installmentNum}</td>
                <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">
                  ₪{row.amount.toLocaleString("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
                <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400">
                  {row.dueDate || "—"}
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${
                    row.isPaid
                      ? "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                  }`}>
                    {row.isPaid ? "שולם" : "ממתין"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
