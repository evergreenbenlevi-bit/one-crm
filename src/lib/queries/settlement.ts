import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Partner } from "@/lib/types/database";

export interface SettlementData {
  benPaid: number;
  avitarPaid: number;
  benShare: number;
  avitarShare: number;
  /** Positive = Avitar owes Ben. Negative = Ben owes Avitar. */
  settlementAmount: number;
  expenseCount: number;
}

export const calculateSettlement = unstable_cache(
  async (startDate: string, endDate: string): Promise<SettlementData> => {
    const supabase = createAdminClient();

    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount, paid_by, split_ratio")
      .gte("date", startDate)
      .lte("date", endDate);

    if (!expenses || expenses.length === 0) {
      return { benPaid: 0, avitarPaid: 0, benShare: 0, avitarShare: 0, settlementAmount: 0, expenseCount: 0 };
    }

    let benPaid = 0;
    let avitarPaid = 0;
    let benShare = 0;
    let avitarShare = 0;

    for (const e of expenses) {
      const amount = Number(e.amount);
      const ratio = Number(e.split_ratio ?? 0.5);
      const paidBy = e.paid_by as Partner;

      // Track who actually paid
      if (paidBy === "ben") benPaid += amount;
      else if (paidBy === "avitar") avitarPaid += amount;
      else {
        // shared = split evenly for tracking (both contributed)
        benPaid += amount * ratio;
        avitarPaid += amount * (1 - ratio);
      }

      // Calculate what each should pay based on split
      benShare += amount * ratio;
      avitarShare += amount * (1 - ratio);
    }

    // Positive = Avitar owes Ben (Ben overpaid), Negative = Ben owes Avitar
    const settlementAmount = benPaid - benShare;

    return {
      benPaid: Math.round(benPaid * 100) / 100,
      avitarPaid: Math.round(avitarPaid * 100) / 100,
      benShare: Math.round(benShare * 100) / 100,
      avitarShare: Math.round(avitarShare * 100) / 100,
      settlementAmount: Math.round(settlementAmount * 100) / 100,
      expenseCount: expenses.length,
    };
  },
  ["settlement-data"],
  { revalidate: 300, tags: ["expenses"] }
);

export async function getSettlementHistory() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("partner_settlements")
    .select("*")
    .order("period_end", { ascending: false })
    .limit(12);
  return data || [];
}

export async function createSettlement(
  periodStart: string,
  periodEnd: string,
  settlement: SettlementData,
  notes?: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("partner_settlements")
    .insert({
      period_start: periodStart,
      period_end: periodEnd,
      ben_total: settlement.benPaid,
      avitar_total: settlement.avitarPaid,
      ben_share: settlement.benShare,
      avitar_share: settlement.avitarShare,
      settlement_amount: settlement.settlementAmount,
      status: "pending",
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markSettlementSettled(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("partner_settlements")
    .update({ status: "settled", settled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
