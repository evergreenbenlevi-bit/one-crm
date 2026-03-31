import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isLocalMode } from "@/lib/env";

/**
 * Verifies the request has a valid Supabase session.
 * Returns the user object or null.
 *
 * NOTE: Does NOT hit user_roles table — all authenticated users of this
 * single-tenant CRM are treated as admin. Eliminates a second DB round trip.
 */
export async function requireAuth(request: NextRequest) {
  if (isLocalMode) return { id: "local-admin", role: "admin" as const };

  // Accept x-crm-secret header for CLI/agent access (Jarvis, crons, scripts)
  const CRM_SECRET = process.env.CRM_API_SECRET || "crm-jarvis-dda52f158017635af1a4deba";
  const headerSecret = request.headers.get("x-crm-secret");
  if (headerSecret === CRM_SECRET) {
    return { id: "api-secret", role: "admin" as const };
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return { id: user.id, role: "admin" as const };
}
