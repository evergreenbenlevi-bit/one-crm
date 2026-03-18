import { createClient } from "@/lib/supabase/server";
import type { LeadStatus, ProgramType, LeadSource } from "@/lib/types/database";

interface LeadFilters {
  program?: ProgramType;
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export async function getLeads(filters: LeadFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("leads").select("*").order("created_at", { ascending: false });

  if (filters.program) query = query.eq("program", filters.program);
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

export async function getLeadsByStatus(program: ProgramType) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("program", program)
    .order("updated_at", { ascending: false });

  const grouped: Record<string, typeof data> = {};
  const statuses: LeadStatus[] = program === "one_vip"
    ? ["new", "consumed_content", "engaged", "applied", "qualified", "active_client"]
    : ["new", "active_client"];

  statuses.forEach(s => { grouped[s] = []; });
  data?.forEach(lead => {
    if (grouped[lead.current_status]) {
      grouped[lead.current_status]!.push(lead);
    }
  });

  return grouped;
}
