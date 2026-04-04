import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserRole = "admin" | "course_editor" | "user";

// Routes only admin can access
export const ADMIN_ONLY_ROUTES = ["/settings", "/goals", "/content", "/research"];

export async function getUserRole(): Promise<UserRole> {
  // Get authenticated user via cookie client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return "user";

  // Query user_roles via admin client to bypass RLS (avoids infinite recursion bug)
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  return (data?.role as UserRole) || "user";
}
