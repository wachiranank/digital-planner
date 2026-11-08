-- Batch 1: task details, repeating tasks, habits

-- Repeating task rules
create table if not exists public.planner_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 500),
  tag text,
  rule text not null check (rule in ('daily', 'weekdays', 'weekly', 'monthly')),
  weekday int check (weekday between 0 and 6),       -- weekly: 0 = Monday
  month_day int check (month_day between 1 and 31),  -- monthly
  last_generated date not null,                      -- tasks exist up to (and including) this day
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.planner_recurring enable row level security;
create policy "own recurring" on public.planner_recurring
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Task details
alter table public.planner_tasks
  add column if not exists notes text check (char_length(notes) <= 5000),
  add column if not exists tag text check (tag in ('work', 'personal', 'side', 'health', 'learn')),
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists recur_id uuid references public.planner_recurring(id) on delete set null;
create unique index if not exists planner_tasks_recur_day on public.planner_tasks (recur_id, day) where recur_id is not null;

alter table public.planner_recurring
  add constraint planner_recurring_tag check (tag is null or tag in ('work', 'personal', 'side', 'health', 'learn'));

-- Habits
create table if not exists public.planner_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  emoji text check (char_length(emoji) <= 8),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.planner_habit_logs (
  habit_id uuid not null references public.planner_habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day date not null,
  primary key (habit_id, day)
);
alter table public.planner_habits enable row level security;
alter table public.planner_habit_logs enable row level security;
create policy "own habits" on public.planner_habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own habit logs" on public.planner_habit_logs
  for all using (user_id = auth.uid()) with check (
    user_id = auth.uid() and exists (select 1 from public.planner_habits h where h.id = habit_id and h.user_id = auth.uid())
  );
