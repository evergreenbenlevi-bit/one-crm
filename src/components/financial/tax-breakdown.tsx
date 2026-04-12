/**
 * TaxBreakdown — Israeli tax-aware P&L section
 * Phase B2: CRM Redesign V2
 * VAT 18% (included in price), Income Tax 23%
 */

const VAT_RATE = 0.18;
const INCOME_TAX_RATE = 0.23;
const ADVANCE_TAX_RATE = 0.3;

interface TaxBreakdownProps {
  grossRevenue: number;   // total revenue incl. VAT
  totalExpenses: number;  // total expenses incl. VAT on inputs
  payrollExpenses?: number;
  advanceTaxPayments?: number;
}

function Row({
  label,
  value,
  sub,
  highlight,
  indent,
  separator,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  indent?: boolean;
  separator?: boolean;
}) {
  return (
    <>
      {separator && <tr><td colSpan={2} className="py-1"><div className="border-t border-gray-100 dark:border-gray-700" /></td></tr>}
      <tr className={highlight ? "bg-gray-50 dark:bg-gray-700/30" : ""}>
        <td className={`py-1.5 text-sm ${indent ? "pl-5 text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-400"}`}>
          {label}
          {sub && <span className="text-xs text-gray-300 dark:text-gray-600 block">{sub}</span>}
        </td>
        <td className={`py-1.5 text-sm text-left font-mono ${highlight ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}>
          {value}
        </td>
      </tr>
    </>
  );
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₪${Math.abs(Math.round(n)).toLocaleString("he-IL")}`;
}

export function TaxBreakdown({
  grossRevenue,
  totalExpenses,
  payrollExpenses = 0,
  advanceTaxPayments = 0,
}: TaxBreakdownProps) {
  const vatCollected = grossRevenue * VAT_RATE / (1 + VAT_RATE);
  const revenueExVat = grossRevenue / (1 + VAT_RATE);
  const vatInput = totalExpenses * VAT_RATE / (1 + VAT_RATE);
  const expensesExVat = totalExpenses / (1 + VAT_RATE);
  const vatNet = vatCollected - vatInput;
  const grossProfit = revenueExVat - expensesExVat;
  const profitBeforeTax = grossProfit - payrollExpenses;
  const incomeTax = Math.max(0, profitBeforeTax) * INCOME_TAX_RATE;
  const netProfit = profitBeforeTax - incomeTax;
  const advanceTax30 = advanceTaxPayments * ADVANCE_TAX_RATE;
  const netToTransfer = advanceTaxPayments - advanceTax30;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">חישוב מס — {new Date().toLocaleDateString("he-IL", { month: "long", year: "numeric" })}</h3>

      <table className="w-full" dir="rtl">
        <tbody>
          {/* Revenue */}
          <Row label="הכנסות כולל מע״מ" value={fmt(grossRevenue)} />
          <Row label="מע״מ עסקאות (18%)" value={fmt(vatCollected)} sub="gross × 18/118" indent />
          <Row label="הכנסות לפני מע״מ" value={fmt(revenueExVat)} highlight />

          {/* Expenses */}
          <Row separator label="הוצאות כולל מע״מ" value={fmt(totalExpenses)} />
          <Row label="מע״מ תשומות" value={fmt(vatInput)} sub="הוצאות × 18/118" indent />
          <Row label="הוצאות לפני מע״מ" value={fmt(expensesExVat)} indent />

          {/* VAT net */}
          <Row separator label={vatNet >= 0 ? "מע״מ לתשלום" : "מע״מ להחזר"} value={fmt(vatNet)} highlight sub="מע״מ עסקאות − מע״מ תשומות" />

          {/* P&L */}
          <Row separator label="רווח גולמי (נטו מע״מ)" value={fmt(grossProfit)} />
          {payrollExpenses > 0 && (
            <Row label="הוצאות שכר ועצמאי" value={fmt(-payrollExpenses)} indent />
          )}
          <Row label="רווח לפני מס" value={fmt(profitBeforeTax)} highlight />
          <Row label="מס הכנסה (23%)" value={fmt(-incomeTax)} indent sub="רווח × 0.23" />
          <Row label="רווח נקי אחרי מס" value={fmt(netProfit)} highlight />

          {/* Advance tax */}
          {advanceTaxPayments > 0 && (
            <>
              <Row separator label="מקדמות מס" value={fmt(advanceTaxPayments)} />
              <Row label="מקדמות 30%" value={fmt(-advanceTax30)} indent />
              <Row label="נטו להעברה" value={fmt(netToTransfer)} highlight />
            </>
          )}
        </tbody>
      </table>

      <p className="text-xs text-gray-300 dark:text-gray-600 mt-4">
        * חישוב להמחשה בלבד — מע״מ 18%, מס הכנסה 23%. אינו מחליף ייעוץ מס מקצועי.
      </p>
    </div>
  );
}
