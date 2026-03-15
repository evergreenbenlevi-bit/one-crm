import { createClient } from "@/lib/supabase/server";

export async function getMeetings(startDate?: string, endDate?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("meetings")
    .select("*, customers(name, email)")
    .order("date", { ascending: true });

  if (startDate) query = query.gte("date", startDate);
  if (endDate) query = query.lte("date", endDate);

  const { data } = await query;
  return data || [];
}
