-- Inbox: a task with no day yet (day is null) waits in the Inbox until it is planned.
-- An inbox task has no time block and is never a repeating copy.
alter table public.planner_tasks alter column day drop not null;

alter table public.planner_tasks drop constraint if exists planner_tasks_inbox_plain;
alter table public.planner_tasks add constraint planner_tasks_inbox_plain
  check (day is not null or (start_at is null and end_at is null and gcal_event_id is null and recur_id is null));

create index if not exists planner_tasks_inbox on public.planner_tasks (user_id, created_at) where day is null;
