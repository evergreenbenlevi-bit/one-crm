-- Enable UUID generation
create extension if not exists "uuid-ossp" schema extensions;

-- ENUMS
create type lead_status as enum ('new', 'consumed_content', 'engaged', 'applied', 'qualified', 'onboarding', 'active_client', 'completed', 'lost');
create type program_type as enum ('one_core', 'one_vip', 'workshop', 'digital_product');
create type lead_source as enum ('campaign', 'organic', 'youtube', 'referral', 'instagram', 'linkedin', 'content', 'webinar', 'skool', 'other');
create type customer_status as enum ('active', 'completed', 'churned');
create type payment_method as enum ('cardcom', 'upay', 'paypal', 'bank_transfer', 'other');
create type payment_status as enum ('completed', 'pending', 'failed', 'refunded');
create type meeting_type as enum ('discovery_call', 'onboarding', 'strategy_session', 'monthly_1on1', 'group_zoom', 'workshop');
create type meeting_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type file_type as enum ('contract', 'meeting_summary', 'transcript', 'other');
create type goal_type as enum ('revenue', 'customers', 'custom');
create type funnel_event_type as enum ('viewed_content', 'engaged_dm', 'visited_offer_doc', 'applied', 'qualified', 'started_onboarding', 'purchased', 'completed_program');
create type expense_category as enum ('meta_ads', 'ai_tools', 'editing_design', 'software', 'content_creation', 'coaching_tools', 'education', 'skool', 'other');
create type application_status as enum ('pending', 'approved', 'rejected');
create type automation_status as enum ('success', 'error');

-- TABLES
create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  occupation text,
  source lead_source default 'other',
  campaign_id text,
  ad_id text,
  ad_name text,
  interest_program program_type,
  instagram_handle text,
  how_found_us text,
  pain_points text,
  current_status lead_status default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete set null,
  name text not null,
  email text,
  phone text,
  occupation text,
  program program_type,
  mentor text default 'בן',
  skool_username text,
  total_paid numeric(10,2) default 0,
  payment_status payment_status default 'pending',
  program_start_date date,
  program_end_date date,
  current_month integer default 0,
  status customer_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  program program_type not null,
  amount numeric(10,2) not null,
  date timestamptz default now(),
  payment_method payment_method default 'other',
  installments_total integer default 1,
  installments_paid integer default 1,
  status payment_status default 'completed',
  external_id text,
  created_at timestamptz default now()
);

create table funnel_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  event_type funnel_event_type not null,
  timestamp timestamptz default now(),
  metadata jsonb default '{}'
);

create table campaigns (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  name text not null,
  program program_type,
  daily_spend numeric(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  leads_count integer default 0,
  purchases integer default 0,
  date date not null,
  created_at timestamptz default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  date timestamptz not null,
  type meeting_type not null,
  summary text,
  transcript_url text,
  status meeting_status default 'scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  type file_type default 'other',
  name text not null,
  url text not null,
  uploaded_at timestamptz default now()
);

create table goals (
  id uuid primary key default gen_random_uuid(),
  quarter integer not null check (quarter between 1 and 4),
  year integer not null,
  target_type goal_type not null,
  target_value numeric(10,2) not null,
  current_value numeric(10,2) default 0,
  label text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  content text not null,
  author text default 'בן',
  created_at timestamptz default now(),
  check (lead_id is not null or customer_id is not null)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  category expense_category not null,
  amount numeric(10,2) not null,
  date date not null,
  description text,
  external_id text,
  created_at timestamptz default now()
);

create table applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  answers jsonb not null default '{}',
  score integer,
  status application_status default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table content_metrics (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  post_url text,
  post_date date,
  views integer default 0,
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  saves integer default 0,
  leads_generated integer default 0,
  notes text,
  created_at timestamptz default now()
);

create table automations_log (
  id uuid primary key default gen_random_uuid(),
  automation_name text not null,
  trigger text,
  action text,
  target_entity text,
  target_id uuid,
  status automation_status default 'success',
  details jsonb default '{}',
  executed_at timestamptz default now()
);

-- INDEXES
create index idx_leads_program on leads(interest_program);
create index idx_leads_status on leads(current_status);
create index idx_leads_created on leads(created_at);
create index idx_leads_email on leads(email);
create index idx_customers_status on customers(status);
create index idx_customers_lead on customers(lead_id);
create index idx_customers_program on customers(program);
create index idx_transactions_customer on transactions(customer_id);
create index idx_transactions_date on transactions(date);
create index idx_transactions_program on transactions(program);
create index idx_funnel_events_lead on funnel_events(lead_id);
create index idx_funnel_events_type on funnel_events(event_type);
create index idx_campaigns_date on campaigns(date);
create index idx_campaigns_external on campaigns(external_id);
create index idx_meetings_customer on meetings(customer_id);
create index idx_meetings_date on meetings(date);
create index idx_expenses_date on expenses(date);
create index idx_expenses_category on expenses(category);
create index idx_notes_lead on notes(lead_id);
create index idx_notes_customer on notes(customer_id);
create index idx_applications_lead on applications(lead_id);
create index idx_applications_status on applications(status);
create index idx_content_metrics_platform on content_metrics(platform);
create index idx_content_metrics_post_date on content_metrics(post_date);
create index idx_automations_log_name on automations_log(automation_name);
create index idx_automations_log_executed on automations_log(executed_at);

-- ROW LEVEL SECURITY
alter table leads enable row level security;
alter table customers enable row level security;
alter table transactions enable row level security;
alter table funnel_events enable row level security;
alter table campaigns enable row level security;
alter table meetings enable row level security;
alter table files enable row level security;
alter table goals enable row level security;
alter table notes enable row level security;
alter table expenses enable row level security;
alter table applications enable row level security;
alter table content_metrics enable row level security;
alter table automations_log enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users full access" on leads for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on customers for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on transactions for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on funnel_events for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on campaigns for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on meetings for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on files for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on goals for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on notes for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on expenses for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on applications for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on content_metrics for all using (auth.role() = 'authenticated');
create policy "Authenticated users full access" on automations_log for all using (auth.role() = 'authenticated');

-- Allow service role (n8n) full access
create policy "Service role full access" on leads for all using (auth.role() = 'service_role');
create policy "Service role full access" on customers for all using (auth.role() = 'service_role');
create policy "Service role full access" on transactions for all using (auth.role() = 'service_role');
create policy "Service role full access" on funnel_events for all using (auth.role() = 'service_role');
create policy "Service role full access" on campaigns for all using (auth.role() = 'service_role');
create policy "Service role full access" on meetings for all using (auth.role() = 'service_role');
create policy "Service role full access" on files for all using (auth.role() = 'service_role');
create policy "Service role full access" on goals for all using (auth.role() = 'service_role');
create policy "Service role full access" on notes for all using (auth.role() = 'service_role');
create policy "Service role full access" on expenses for all using (auth.role() = 'service_role');
create policy "Service role full access" on applications for all using (auth.role() = 'service_role');
create policy "Service role full access" on content_metrics for all using (auth.role() = 'service_role');
create policy "Service role full access" on automations_log for all using (auth.role() = 'service_role');

-- UPDATED_AT TRIGGER
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on leads for each row execute function update_updated_at();
create trigger set_updated_at before update on customers for each row execute function update_updated_at();
create trigger set_updated_at before update on meetings for each row execute function update_updated_at();
create trigger set_updated_at before update on goals for each row execute function update_updated_at();
create trigger set_updated_at before update on applications for each row execute function update_updated_at();
