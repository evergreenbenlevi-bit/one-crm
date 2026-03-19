export type LeadStatus = "new" | "consumed_content" | "engaged" | "applied" | "qualified" | "onboarding" | "active_client" | "completed" | "lost";
export type ProgramType = "one_core" | "one_vip";
export type LeadSource = "campaign" | "organic" | "youtube" | "referral" | "instagram" | "linkedin" | "content" | "webinar" | "skool" | "other";
export type CustomerStatus = "active" | "completed" | "churned";
export type PaymentMethod = "cardcom" | "upay" | "other";
export type PaymentStatus = "completed" | "pending" | "failed" | "refunded";
export type MeetingType = "onboarding" | "monthly_1on1" | "group_zoom";
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type FileType = "contract" | "meeting_summary" | "transcript" | "other";
export type GoalType = "revenue" | "customers" | "custom";
export type FunnelEventType = "registered" | "consumed_content" | "engaged" | "applied" | "qualified" | "purchased" | "viewed_content" | "engaged_dm" | "visited_offer_doc" | "started_onboarding" | "completed_program" | "onboarding" | "active_client" | "completed" | "lost";
export type ExpenseCategory = "meta_ads" | "ai_tools" | "editing_design" | "software" | "other";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  source: LeadSource;
  campaign_id: string | null;
  ad_id: string | null;
  ad_name: string | null;
  program: ProgramType;
  interest_program: ProgramType | null;  // DB original field — mirrors program
  instagram_handle: string | null;
  how_found_us: string | null;
  pain_points: string | null;
  current_status: LeadStatus;
  lead_score: number | null;
  score_level: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  lead_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  program: ProgramType | null;           // DB: single program field
  products_purchased: ProgramType[];     // Used in app code (derived/webhook)
  mentor: string | null;
  skool_username: string | null;
  total_paid: number;
  payment_status: PaymentStatus;
  program_start_date: string | null;
  program_end_date: string | null;
  current_month: number;
  status: CustomerStatus;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  program: ProgramType;
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  installments_total: number;
  installments_paid: number;
  status: PaymentStatus;
  external_id: string | null;
  created_at: string;
}

export interface FunnelEvent {
  id: string;
  lead_id: string;
  event_type: FunnelEventType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  external_id: string | null;
  name: string;
  program: ProgramType | null;
  daily_spend: number;
  impressions: number;
  clicks: number;
  leads_count: number;
  purchases: number;
  date: string;
  created_at: string;
}

export interface Meeting {
  id: string;
  customer_id: string | null;
  lead_id: string | null;
  date: string;
  type: MeetingType;
  summary: string | null;
  transcript_url: string | null;
  status: MeetingStatus;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  customer_id: string;
  type: FileType;
  name: string;
  url: string;
  uploaded_at: string;
}

export interface Goal {
  id: string;
  quarter: number;
  year: number;
  target_type: GoalType;
  target_value: number;
  current_value: number;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  lead_id: string | null;
  customer_id: string | null;
  content: string;
  author: string;
  created_at: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string | null;
  external_id: string | null;
  created_at: string;
}
