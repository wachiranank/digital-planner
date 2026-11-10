-- Daily routine: morning planning + evening "close the day" (shutdown) with a short daily note.

alter table public.planner_profiles
  add column if not exists evening_review boolean not null default true,  -- 20:00 "ปิดวัน" summary
  add column if not exists last_evening_day date;

-- One short reflection per day (mood 1–5 + note)
create table if not exists public.planner_day_notes (
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  day date not null,
  mood smallint check (mood between 1 and 5),
  note text check (char_length(note) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.planner_day_notes enable row level security;
drop policy if exists "own day notes" on public.planner_day_notes;
create policy "own day notes" on public.planner_day_notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
