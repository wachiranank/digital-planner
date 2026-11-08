-- Digital Planner — runs in the same Supabase project as the store.
-- Tables are prefixed planner_ so they never clash with store tables.

create table public.planner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  license_key text,            -- written only by the server (secret key), never by the client
  licensed_at timestamptz,
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now()
);

create table public.planner_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 500),
  day date not null,                       -- the day the task is planned for
  is_priority boolean not null default false, -- "top 3" of the day
  done boolean not null default false,
  done_at timestamptz,
  start_at timestamptz,                    -- time block (phase 3: synced to Google Calendar)
  end_at timestamptz,
  gcal_event_id text,
  created_at timestamptz not null default now()
);
create index planner_tasks_user_day on public.planner_tasks (user_id, day);

alter table public.planner_profiles enable row level security;
alter table public.planner_tasks    enable row level security;

-- Users may read their own profile; inserts/updates go through the server only
create policy "read own profile" on public.planner_profiles
  for select using (user_id = auth.uid());

-- Users fully manage their own tasks
create policy "own tasks select" on public.planner_tasks for select using (user_id = auth.uid());
create policy "own tasks insert" on public.planner_tasks for insert with check (user_id = auth.uid());
create policy "own tasks update" on public.planner_tasks for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks delete" on public.planner_tasks for delete using (user_id = auth.uid());
