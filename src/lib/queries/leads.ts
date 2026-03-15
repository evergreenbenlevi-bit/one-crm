import { createClient } from "@/lib/supabase/server";
import type { LeadStatus, ProductType, LeadSource } from "@/lib/types/database";

interface LeadFilters {
  product?: ProductType;
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function getLeads(filters: LeadFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

  if (filters.product) query = query.eq("product", filters.product);
  if (filters.status) query = query.eq("current_status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", filters.endDate);

  const { data } = await query;
  return data || [];
}

export async function getLeadById(id: string) {
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (!lead) return null;

  const { data: events } = await supabase
    .from("funnel_events")
    .select("*")
    .eq("lead_id", id)
    .order("timestamp", { ascending: true });

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("lead_id", id)
    .maybeSingle();

  return { ...lead, events: events || [], notes: notes || [], customer };
}

export async function getLeadsByStatus(product: ProductType) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("product", product)
    .order("updated_at", { ascending: false });

  const grouped: Record<string, typeof data> = {};
  const statuses: LeadStatus[] = product === "simply_grow"
    ? ["new", "watched_vsl", "got_wa", "filled_questionnaire", "sales_call", "closed"]
    : ["new", "closed"];

  statuses.forEach(s => { grouped[s] = []; });
  data?.forEach(lead => {
    if (grouped[lead.current_status]) {
      grouped[lead.current_status]!.push(lead);
    }
  });

  return grouped;
}
