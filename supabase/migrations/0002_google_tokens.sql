-- Google Calendar sync: per-user refresh token, server access only (RLS on, no policies).
create table public.planner_google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.planner_google_tokens enable row level security;
