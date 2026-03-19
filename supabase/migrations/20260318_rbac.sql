-- RBAC: Role-Based Access Control for ONE™ CRM
-- Added: 2026-03-18

-- ENUM
create type user_role as enum ('admin', 'user');

-- USER ROLES TABLE
create table user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- INDEXES
create index idx_user_roles_user on user_roles(user_id);
create index idx_user_roles_role on user_roles(role);

-- RLS
alter table user_roles enable row level security;

-- Users can read their own role
create policy "Users can read own role" on user_roles
  for select using (auth.uid() = user_id);

-- Only admins can manage roles
create policy "Admins can manage roles" on user_roles
  for all using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

-- Service role full access
create policy "Service role full access" on user_roles
  for all using (auth.role() = 'service_role');

-- UPDATED_AT TRIGGER
create trigger set_updated_at before update on user_roles
  for each row execute function update_updated_at();

-- AUTO-ASSIGN: New users get 'user' role by default
create or replace function handle_new_user_role()
returns trigger as $$
begin
  insert into user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user_role();
