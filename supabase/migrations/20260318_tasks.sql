-- Task Manager Module for ONE™ CRM
-- Added: 2026-03-18

-- ENUMS
create type task_priority as enum ('p1', 'p2', 'p3');
create type task_status as enum ('backlog', 'todo', 'in_progress', 'waiting_ben', 'done');
create type task_owner as enum ('claude', 'ben', 'both', 'avitar');
create type task_category as enum ('one_tm', 'infrastructure', 'personal', 'research', 'content');

-- TASKS TABLE
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority task_priority default 'p2',
  status task_status default 'todo',
  owner task_owner default 'claude',
  category task_category default 'one_tm',
  due_date date,
  depends_on uuid references tasks(id) on delete set null,
  parent_id uuid references tasks(id) on delete cascade,
  source text, -- 'kanban', 'dashboard', 'braindump', 'conversation'
  source_date date,
  completed_at timestamptz,
  position integer default 0, -- for ordering within a column
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- INDEXES
create index idx_tasks_status on tasks(status);
create index idx_tasks_priority on tasks(priority);
create index idx_tasks_owner on tasks(owner);
create index idx_tasks_category on tasks(category);
create index idx_tasks_parent on tasks(parent_id);
create index idx_tasks_due on tasks(due_date);
create index idx_tasks_position on tasks(status, position);

-- RLS
alter table tasks enable row level security;
create policy "Authenticated users full access" on tasks for all using (auth.role() = 'authenticated');
create policy "Service role full access" on tasks for all using (auth.role() = 'service_role');

-- UPDATED_AT TRIGGER
create trigger set_updated_at before update on tasks for each row execute function update_updated_at();

-- AUTO SET completed_at
create or replace function set_completed_at()
returns trigger as $$
begin
  if new.status = 'done' and old.status != 'done' then
    new.completed_at = now();
  end if;
  if new.status != 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_task_completed before update on tasks for each row execute function set_completed_at();
