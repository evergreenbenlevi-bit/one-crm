-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ENUMS
create type lead_status as enum ('new', 'watched_vsl', 'got_wa', 'filled_questionnaire', 'sales_call', 'closed', 'lost');
create type product_type as enum ('freedom', 'simply_grow');
create type lead_source as enum ('campaign', 'organic', 'youtube', 'referral', 'other');
create type customer_status as enum ('active', 'completed', 'churned');
create type payment_method as enum ('cardcom', 'upay', 'other');
create type payment_status as enum ('completed', 'pending', 'failed', 'refunded');
create type meeting_type as enum ('sales_call', 'onboarding', 'monthly_1on1', 'group_zoom');
create type meeting_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type file_type as enum ('contract', 'meeting_summary', 'transcript', 'other');
create type goal_type as enum ('revenue', 'customers', 'custom');
create type funnel_event_type as enum ('registered', 'watched_vsl', 'got_wa', 'replied_watched', 'filled_questionnaire', 'sales_call', 'purchased');
create type expense_category as enum ('meta_ads', 'ai_tools', 'editing_design', 'software', 'other');

-- TABLES
create table leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  occupation text,
  source lead_source default 'other',
  campaign_id text,
  ad_id text,
  ad_name text,
  product product_type not null,
  current_status lead_status default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete set null,
  name text not null,
  email text,
  phone text,
  occupation text,
  products_purchased product_type[] default '{}',
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
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  product product_type not null,
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
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  event_type funnel_event_type not null,
  timestamp timestamptz default now(),
  metadata jsonb default '{}'
);

create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  external_id text unique,
  name text not null,
  product product_type,
  daily_spend numeric(10,2) default 0,
  impressions integer default 0,
  clicks integer default 0,
  leads_count integer default 0,
  purchases integer default 0,
  date date not null,
  created_at timestamptz default now()
);

create table meetings (
  id uuid primary key default uuid_generate_v4(),
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
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references customers(id) on delete cascade,
  type file_type default 'other',
  name text not null,
  url text not null,
  uploaded_at timestamptz default now()
);

create table goals (
  id uuid primary key default uuid_generate_v4(),
  quarter integer not null check (quarter between 1 and 4),
  year integer not null,
  target_type goal_type not null,
  target_value numeric(10,2) not null,
  current_value numeric(10,2) default 0,
  label text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(quarter, year)
);

create table notes (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references leads(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  content text not null,
  author text default 'נועם',
  created_at timestamptz default now(),
  check (lead_id is not null or customer_id is not null)
);

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  category expense_category not null,
  amount numeric(10,2) not null,
  date date not null,
  description text,
  external_id text,
  created_at timestamptz default now()
);

-- INDEXES
create index idx_leads_product on leads(product);
create index idx_leads_status on leads(current_status);
create index idx_leads_created on leads(created_at);
create index idx_leads_email on leads(email);
create index idx_customers_status on customers(status);
create index idx_customers_lead on customers(lead_id);
create index idx_transactions_customer on transactions(customer_id);
create index idx_transactions_date on transactions(date);
create index idx_transactions_product on transactions(product);
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
