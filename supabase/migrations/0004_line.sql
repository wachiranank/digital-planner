-- Phase 6: LINE Official Account reminders
alter table public.planner_profiles
  add column if not exists line_user_id text,
  add column if not exists line_link_code text,
  add column if not exists line_link_expires timestamptz,
  add column if not exists line_notify boolean not null default true;

create unique index if not exists planner_profiles_line_user on public.planner_profiles (line_user_id) where line_user_id is not null;
create unique index if not exists planner_profiles_line_code on public.planner_profiles (line_link_code) where line_link_code is not null;
