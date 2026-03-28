import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Module-level singleton — reused across requests in the same process
let _adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _adminClient;
}
