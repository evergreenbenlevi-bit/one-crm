import { createClient } from "@/lib/supabase/server";

export async function getCampaigns(startDate?: string, endDate?: string) {
  const supabase = await createClient();
  let query = supabase.from("campaigns").select("*").order("date", { ascending: false });

  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data } = await query;
  return data || [];
}
