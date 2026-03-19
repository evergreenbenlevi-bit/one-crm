import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "user";

// Routes only admin can access
export const ADMIN_ONLY_ROUTES = ["/settings", "/goals", "/content"];

export async function getUserRole(): Promise<UserRole> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "user";

  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (data?.role as UserRole) || "user";
}
