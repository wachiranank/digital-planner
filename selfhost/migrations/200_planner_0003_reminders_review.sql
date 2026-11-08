-- Phase 5: push reminders + weekly review

-- Browser push subscriptions (one per device). Server-only: RLS on, no policies.
create table if not exists public.planner_push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.planner_push_subs enable row level security;
create index if not exists planner_push_subs_user on public.planner_push_subs (user_id);

-- Reminder settings + "already sent" markers (written by the server)
alter table public.planner_profiles
  add column if not exists remind_minutes int not null default 10,
  add column if not exists daily_digest boolean not null default true,
  add column if not exists last_digest_day date,
  add column if not exists last_review_nudge date;

alter table public.planner_tasks add column if not exists reminded_at timestamptz;
create index if not exists planner_tasks_due on public.planner_tasks (start_at)
  where reminded_at is null and done = false and start_at is not null;

-- Weekly review notes
create table if not exists public.planner_reviews (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  week_start date not null,              -- Monday of the reviewed week
  wins text,
  improve text,
  focus text,                             -- focus for the following week
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.planner_reviews enable row level security;
create policy "own reviews" on public.planner_reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
