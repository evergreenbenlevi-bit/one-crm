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

const LEAD_LIST_FIELDS = "id,name,email,phone,program,interest_program,current_status,source,created_at,updated_at,instagram_handle,occupation" as const;

export async function getLeads(filters: LeadFilters = {}) {
  const supabase = await createClient();
  let query = supabase.from("leads").select(LEAD_LIST_FIELDS).order("created_at", { ascending: false });

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

  // Fetch related data in parallel — saves ~300ms vs sequential
  const [eventsResult, notesResult, customerResult] = await Promise.all([
    supabase
      .from("funnel_events")
      .select("*")
      .eq("lead_id", id)
      .order("timestamp", { ascending: true }),
    supabase
      .from("notes")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customers")
      .select("*")
      .eq("lead_id", id)
      .maybeSingle(),
  ]);

  return {
    ...lead,
    events: eventsResult.data || [],
    notes: notesResult.data || [],
    customer: customerResult.data,
  };
}

export async function getLeadsByStatus(program: ProgramType) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select(LEAD_LIST_FIELDS)
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
