import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const getCampaigns = unstable_cache(
  async (startDate?: string, endDate?: string) => {
    const supabase = createAdminClient();
    let query = supabase
      .from("campaigns")
      .select("*")
      .order("date", { ascending: false })
      .limit(200);

    if (startDate) query = query.gte("date", startDate);
    if (endDate) query = query.lte("date", endDate);

    const { data } = await query;
    return data || [];
  },
  ["campaigns"],
  { revalidate: 120, tags: ["campaigns"] }
);
