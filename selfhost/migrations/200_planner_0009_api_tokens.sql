-- Personal API tokens for Siri Shortcuts / Apple Watch ("เพิ่มงาน", "งานวันนี้").
-- Only a SHA-256 hash is stored; the token is shown once when created.
create table if not exists public.planner_api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token_hash text not null unique,
  prefix text not null,                 -- first characters, to recognise a token in the list
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.planner_api_tokens enable row level security;
-- Users may see and revoke their own tokens; creating one goes through the server.
drop policy if exists "own tokens read" on public.planner_api_tokens;
create policy "own tokens read" on public.planner_api_tokens for select using (user_id = auth.uid());
drop policy if exists "own tokens delete" on public.planner_api_tokens;
create policy "own tokens delete" on public.planner_api_tokens for delete using (user_id = auth.uid());
create index if not exists planner_api_tokens_user on public.planner_api_tokens (user_id);
