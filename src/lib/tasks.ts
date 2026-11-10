import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { createEvent, getAccessToken } from "./google";
import { todayBangkok } from "./access";
import type { Rule } from "./tags";

export const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export const weekdayIdx = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0

/**
 * Creates a task; with a time it is also put on Google Calendar (if connected).
 * `day: null` puts it in the Inbox (no day, so any time is ignored).
 */
export async function createTaskFor(
  userId: string,
  t: { title: string; day: string | null; time?: string | null; minutes?: number | null },
): Promise<{ id: string; start?: string; end?: string; calendar: boolean } | null> {
  const admin = supabaseAdmin();
  const row: Record<string, unknown> = { user_id: userId, title: t.title.slice(0, 500), day: t.day };
  let calendar = false;
  if (t.time && t.day) {
    const start = new Date(`${t.day}T${t.time}:00+07:00`);
    const end = new Date(start.getTime() + Math.min(Math.max(t.minutes ?? 60, 5), 480) * 60e3);
    Object.assign(row, { start_at: start.toISOString(), end_at: end.toISOString() });
    const token = await getAccessToken(userId);
    if (token) {
      const ev = await createEvent(token, row.title as string, start.toISOString(), end.toISOString()).catch(() => null);
      if (ev?.id) {
        row.gcal_event_id = ev.id;
        calendar = true;
      }
    }
  }
  const { data } = await admin.from("planner_tasks").insert(row).select("id").single();
  if (!data) return null;
  return { id: data.id, start: row.start_at as string | undefined, end: row.end_at as string | undefined, calendar };
}

function matches(rule: { rule: Rule; weekday: number | null; month_day: number | null }, day: string) {
  const w = weekdayIdx(day);
  if (rule.rule === "daily") return true;
  if (rule.rule === "weekdays") return w <= 4;
  if (rule.rule === "weekly") return w === rule.weekday;
  // monthly: that date, or the last day of shorter months
  const d = Number(day.slice(8, 10));
  const last = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate();
  return d === rule.month_day || (rule.month_day! > last && d === last);
}

/**
 * Makes sure repeating tasks exist up to `until` (inclusive). Never backfills the past,
 * and never re-creates an instance the user deleted (the rule remembers how far it got).
 */
export async function ensureRecurring(userId: string, until: string) {
  const admin = supabaseAdmin();
  const today = todayBangkok();
  const { data: rules } = await admin
    .from("planner_recurring")
    .select("id, title, tag, rule, weekday, month_day, last_generated")
    .eq("user_id", userId)
    .eq("active", true)
    .lt("last_generated", until);
  for (const r of rules ?? []) {
    let day = addDays(r.last_generated > today ? r.last_generated : addDays(today, -1), 1);
    const rows: Record<string, unknown>[] = [];
    for (; day <= until; day = addDays(day, 1)) {
      if (matches(r, day)) rows.push({ user_id: userId, title: r.title, tag: r.tag, day, recur_id: r.id });
    }
    if (rows.length) {
      const { error } = await admin.from("planner_tasks").insert(rows);
      if (error) for (const row of rows) await admin.from("planner_tasks").insert(row); // a duplicate day is skipped
    }
    await admin.from("planner_recurring").update({ last_generated: until }).eq("id", r.id);
  }
}
