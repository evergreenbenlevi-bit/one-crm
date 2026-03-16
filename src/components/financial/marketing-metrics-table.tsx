interface ProductMetrics {
  cpl: number;
  cac: number;
  roas: number;
  conversion: number;
}

interface MarketingMetricsTableProps {
  freedom: ProductMetrics;
  simplyGrow: ProductMetrics;
}

function formatCurrency(value: number): string {
  return `₪${value.toLocaleString("he-IL")}`;
}

export function MarketingMetricsTable({ freedom, simplyGrow }: MarketingMetricsTableProps) {
  const rows = [
    { label: "החופש לשווק", ...freedom },
    { label: "פשוט לצמוח", ...simplyGrow },
  ];

  // Weighted average for total row (simple average since both share the same lead pool)
  const totalRow = {
    label: "סה״כ",
    cpl: freedom.cpl, // Same CPL for both (shared lead pool)
    cac: Math.round(((freedom.cac || 0) + (simplyGrow.cac || 0)) / 2),
    roas: (freedom.roas || 0) + (simplyGrow.roas || 0),
    conversion: Math.round(((freedom.conversion || 0) + (simplyGrow.conversion || 0)) * 10) / 10,
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-gray-900/20 border border-gray-100 dark:border-gray-700">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">מדדי שיווק</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">מוצר</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">CPL</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">CAC</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">המרה %</th>
              <th className="text-right py-3 px-2 font-medium text-gray-500 dark:text-gray-400">ROAS %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/50">
                <td className="py-3 px-2 font-medium dark:text-gray-200">{row.label}</td>
                <td className="py-3 px-2">{formatCurrency(row.cpl)}</td>
                <td className="py-3 px-2">{formatCurrency(row.cac)}</td>
                <td className="py-3 px-2">{row.conversion}%</td>
                <td className="py-3 px-2">
                  <span
                    className={
                      row.roas >= 100
                        ? "text-success font-bold"
                        : row.roas >= 50
                        ? "text-warning font-bold"
                        : "text-danger font-bold"
                    }
                  >
                    {row.roas}%
                  </span>
                </td>
              </tr>
            ))}
            <tr className="bg-brand-50/50 dark:bg-brand-900/20 font-bold">
              <td className="py-3 px-2">{totalRow.label}</td>
              <td className="py-3 px-2">{formatCurrency(totalRow.cpl)}</td>
              <td className="py-3 px-2">{formatCurrency(totalRow.cac)}</td>
              <td className="py-3 px-2">{totalRow.conversion}%</td>
              <td className="py-3 px-2">
                <span
                  className={
                    totalRow.roas >= 100
                      ? "text-success"
                      : totalRow.roas >= 50
                      ? "text-warning"
                      : "text-danger"
                  }
                >
                  {totalRow.roas}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
