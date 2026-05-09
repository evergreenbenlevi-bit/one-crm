import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Partner } from "@/lib/types/database";

export interface SettlementData {
  benPaid: number;
  evyatarPaid: number;
  benShare: number;
  evyatarShare: number;
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
      return { benPaid: 0, evyatarPaid: 0, benShare: 0, evyatarShare: 0, settlementAmount: 0, expenseCount: 0 };
    }

    let benPaid = 0;
    let evyatarPaid = 0;
    let benShare = 0;
    let evyatarShare = 0;

    for (const e of expenses) {
      const amount = Number(e.amount);
      const ratio = Number(e.split_ratio ?? 0.5);
      const paidBy = e.paid_by as Partner;

      // Track who actually paid
      if (paidBy === "ben") benPaid += amount;
      else if (paidBy === "evyatar") evyatarPaid += amount;
      else {
        // shared = split evenly for tracking (both contributed)
        benPaid += amount * ratio;
        evyatarPaid += amount * (1 - ratio);
      }

      // Calculate what each should pay based on split
      benShare += amount * ratio;
      evyatarShare += amount * (1 - ratio);
    }

    // Positive = Avitar owes Ben (Ben overpaid), Negative = Ben owes Avitar
    const settlementAmount = benPaid - benShare;

    return {
      benPaid: Math.round(benPaid * 100) / 100,
      evyatarPaid: Math.round(evyatarPaid * 100) / 100,
      benShare: Math.round(benShare * 100) / 100,
      evyatarShare: Math.round(evyatarShare * 100) / 100,
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
      avitar_total: settlement.evyatarPaid,
      ben_share: settlement.benShare,
      avitar_share: settlement.evyatarShare,
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
