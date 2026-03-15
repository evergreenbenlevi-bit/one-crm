import { createClient } from "@/lib/supabase/server";

export async function getGoals() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  return data || [];
}

export async function getCurrentGoal() {
  const supabase = await createClient();
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const year = now.getFullYear();

  const { data } = await supabase
    .from("goals")
    .select("*")
    .eq("quarter", quarter)
    .eq("year", year)
    .maybeSingle();

  return data;
}
