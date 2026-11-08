-- Custom categories (built-in keys work/personal/side/health/learn stay; custom ones store their uuid in tag)
create table if not exists public.planner_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 30),
  color text not null default 'slate' check (char_length(color) <= 20),
  created_at timestamptz not null default now()
);
alter table public.planner_tags enable row level security;
create policy "own tags" on public.planner_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.planner_tasks drop constraint if exists planner_tasks_tag_check;
alter table public.planner_tasks add constraint planner_tasks_tag_len check (tag is null or char_length(tag) <= 40);
alter table public.planner_recurring drop constraint if exists planner_recurring_tag;
