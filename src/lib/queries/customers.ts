import { createClient } from "@/lib/supabase/server";
import type { CustomerStatus, ProgramType } from "@/lib/types/database";

interface CustomerFilters {
  status?: CustomerStatus;
  product?: ProgramType;
  search?: string;
}

export async function getCustomers(filters: CustomerFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.product) query = query.contains("products_purchased", [filters.product]);
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);

  const { data } = await query;
  return data || [];
}

export async function getCustomerById(id: string) {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (!customer) return null;

  const [transactions, meetings, files, notes, events] = await Promise.all([
    supabase.from("transactions").select("*").eq("customer_id", id).order("date", { ascending: false }),
    supabase.from("meetings").select("*").eq("customer_id", id).order("date", { ascending: false }),
    supabase.from("files").select("*").eq("customer_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("notes").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    customer.lead_id
      ? supabase.from("funnel_events").select("*").eq("lead_id", customer.lead_id).order("timestamp", { ascending: true })
      : { data: [] },
  ]);

  return {
    ...customer,
    transactions: transactions.data || [],
    meetings: meetings.data || [],
    files: files.data || [],
    notes: notes.data || [],
    events: events.data || [],
  };
}
