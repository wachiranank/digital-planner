-- Daily routine schedule chosen by each user (was fixed in code: 07:30 / 20:00 / Sunday 18:00).
-- Times are minutes after midnight, Bangkok time. routine_days is a weekday bitmask: bit 0 = Sunday … bit 6 = Saturday.

alter table public.planner_profiles
  add column if not exists morning_time smallint not null default 450   check (morning_time between 0 and 1439),  -- 07:30
  add column if not exists evening_time smallint not null default 1200  check (evening_time between 0 and 1439),  -- 20:00
  add column if not exists routine_days smallint not null default 127   check (routine_days between 1 and 127),   -- every day
  add column if not exists weekly_review boolean not null default true,
  add column if not exists review_dow smallint not null default 0       check (review_dow between 0 and 6),       -- Sunday
  add column if not exists review_time smallint not null default 1080   check (review_time between 0 and 1439);   -- 18:00
