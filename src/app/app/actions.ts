"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { todayBangkok } from "@/lib/access";
import { createEvent, deleteEvent, getAccessToken, patchEvent } from "@/lib/google";
import { parseQuick } from "@/lib/thai-parse";
import { createTaskFor, ensureRecurring, addDays, weekdayIdx } from "@/lib/tasks";
import { isColor, isRule, type CheckItem } from "@/lib/tags";
import { validTag } from "@/lib/tags-server";

async function db() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return { supabase, user };
}

async function getTask(id: string) {
  const { supabase, user } = await db();
  const { data: task } = await supabase
    .from("planner_tasks")
    .select("id, title, day, gcal_event_id")
    .eq("id", id)
    .maybeSingle();
  return { supabase, user, task };
}

const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function addTask(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  if (!title) return;
  const dayInput = form.get("day");
  const baseDay = isDay(dayInput) ? dayInput : todayBangkok();
  const { user } = await db();
  // Thai quick add: "ประชุม พรุ่งนี้ บ่าย 2 1 ชม." → day + time block (+ Google Calendar event)
  const p = parseQuick(title, todayBangkok());
  await createTaskFor(user.id, { title: p.title, day: p.day ?? baseDay, time: p.time, minutes: p.minutes });
  revalidatePath("/app", "layout");
}

/** Move a task to another day; a time-blocked task keeps its clock time and its Google event moves too. */
export async function moveTask(id: string, newDay: string) {
  if (!isDay(newDay)) return;
  const { supabase, user } = await db();
  const { data: task } = await supabase
    .from("planner_tasks")
    .select("id, day, start_at, end_at, gcal_event_id")
    .eq("id", id)
    .maybeSingle();
  if (!task || task.day === newDay) return;

  const update: Record<string, unknown> = { day: newDay };
  if (task.start_at && task.end_at) {
    const shift = Date.parse(`${newDay}T00:00:00+07:00`) - Date.parse(`${task.day}T00:00:00+07:00`);
    const start = new Date(Date.parse(task.start_at) + shift).toISOString();
    const end = new Date(Date.parse(task.end_at) + shift).toISOString();
    Object.assign(update, { start_at: start, end_at: end, reminded_at: null });
    if (task.gcal_event_id) {
      const token = await getAccessToken(user.id);
      if (token) {
        await patchEvent(token, task.gcal_event_id, {
          start: { dateTime: start, timeZone: "Asia/Bangkok" },
          end: { dateTime: end, timeZone: "Asia/Bangkok" },
        }).catch(() => {});
      }
    }
  }
  await supabase.from("planner_tasks").update(update).eq("id", id);
  revalidatePath("/app", "layout");
}

export async function toggleDone(id: string, done: boolean) {
  const { supabase, user, task } = await getTask(id);
  if (!task) return;
  await supabase
    .from("planner_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  // mirror completion in Google Calendar with a ✓ prefix
  if (task.gcal_event_id) {
    const token = await getAccessToken(user.id);
    if (token) await patchEvent(token, task.gcal_event_id, { summary: done ? `✓ ${task.title}` : task.title }).catch(() => {});
  }
  revalidatePath("/app", "layout");
}

export async function togglePriority(id: string, isPriority: boolean) {
  const { supabase } = await db();
  if (isPriority) {
    // keep the "top 3" rule
    const { count } = await supabase
      .from("planner_tasks")
      .select("id", { count: "exact", head: true })
      .eq("day", todayBangkok())
      .eq("is_priority", true)
      .eq("done", false);
    if ((count ?? 0) >= 3) return;
  }
  await supabase.from("planner_tasks").update({ is_priority: isPriority }).eq("id", id);
  revalidatePath("/app", "layout");
}

export async function deleteTask(id: string) {
  const { supabase, user, task } = await getTask(id);
  if (task?.gcal_event_id) {
    const token = await getAccessToken(user.id);
    if (token) await deleteEvent(token, task.gcal_event_id).catch(() => {});
  }
  await supabase.from("planner_tasks").delete().eq("id", id);
  revalidatePath("/app", "layout");
}

/** Time-block a task: creates (or moves) its Google Calendar event. form: id, time "HH:mm", minutes */
export async function scheduleTask(form: FormData) {
  const id = String(form.get("id"));
  const time = String(form.get("time") ?? "");
  const minutes = Math.min(Math.max(Number(form.get("minutes") ?? 30), 5), 480);
  if (!/^\d{2}:\d{2}$/.test(time)) return;

  const { supabase, user, task } = await getTask(id);
  if (!task) return;
  const token = await getAccessToken(user.id);
  if (!token) redirect("/app?calendar=connect");

  // planned for today (carried-over tasks move to today when scheduled)
  const day = todayBangkok();
  const start = new Date(`${day}T${time}:00+07:00`);
  const end = new Date(start.getTime() + minutes * 60_000);

  let eventId = task.gcal_event_id as string | null;
  if (eventId) {
    const moved = await patchEvent(token, eventId, {
      start: { dateTime: start.toISOString(), timeZone: "Asia/Bangkok" },
      end: { dateTime: end.toISOString(), timeZone: "Asia/Bangkok" },
    });
    if (!moved) eventId = null; // deleted in Google meanwhile: recreate
  }
  if (!eventId) {
    const ev = await createEvent(token, task.title, start.toISOString(), end.toISOString());
    eventId = ev?.id ?? null;
  }

  await supabase
    .from("planner_tasks")
    .update({ day, start_at: start.toISOString(), end_at: end.toISOString(), gcal_event_id: eventId, reminded_at: null })
    .eq("id", id);
  revalidatePath("/app", "layout");
}

export async function unscheduleTask(id: string) {
  const { supabase, user, task } = await getTask(id);
  if (!task) return;
  if (task.gcal_event_id) {
    const token = await getAccessToken(user.id);
    if (token) await deleteEvent(token, task.gcal_event_id).catch(() => {});
  }
  await supabase.from("planner_tasks").update({ start_at: null, end_at: null, gcal_event_id: null }).eq("id", id);
  revalidatePath("/app", "layout");
}

/** Weekly review: save reflection notes for the week starting `week_start` (a Monday). */
export async function saveReview(form: FormData) {
  const week_start = form.get("week_start");
  if (!isDay(week_start)) return;
  const clip = (k: string) => String(form.get(k) ?? "").slice(0, 2000).trim() || null;
  const { supabase, user } = await db();
  await supabase.from("planner_reviews").upsert(
    { user_id: user.id, week_start, wins: clip("wins"), improve: clip("improve"), focus: clip("focus"), updated_at: new Date().toISOString() },
    { onConflict: "user_id,week_start" },
  );
  revalidatePath("/app", "layout");
}

/** Weekly review: push every unfinished task of a week to the following Monday. */
export async function moveOpenToNextWeek(form: FormData) {
  const monday = form.get("week_start");
  if (!isDay(monday)) return;
  const sunday = new Date(Date.parse(`${monday}T12:00:00Z`) + 6 * 864e5).toISOString().slice(0, 10);
  const next = new Date(Date.parse(`${monday}T12:00:00Z`) + 7 * 864e5).toISOString().slice(0, 10);
  const { supabase } = await db();
  const { data } = await supabase
    .from("planner_tasks")
    .select("id")
    .eq("done", false)
    .gte("day", monday)
    .lte("day", sunday);
  for (const t of data ?? []) await moveTask(t.id, next);
  revalidatePath("/app", "layout");
}

// ---------- task details ----------
export async function updateTaskDetails(form: FormData) {
  const id = String(form.get("id"));
  const title = String(form.get("title") ?? "").trim().slice(0, 500);
  const notes = String(form.get("notes") ?? "").slice(0, 5000).trim() || null;
  const { supabase, user, task } = await getTask(id);
  if (!task) return;
  const tag = await validTag(supabase, form.get("tag"));
  const update: Record<string, unknown> = { notes, tag };
  if (title && title !== task.title) {
    update.title = title;
    if (task.gcal_event_id) {
      const token = await getAccessToken(user.id);
      if (token) await patchEvent(token, task.gcal_event_id, { summary: title }).catch(() => {});
    }
  }
  await supabase.from("planner_tasks").update(update).eq("id", id);
  revalidatePath("/app", "layout");
}

export async function setChecklist(id: string, items: CheckItem[]) {
  const clean = (Array.isArray(items) ? items : [])
    .slice(0, 50)
    .map((i) => ({ t: String(i.t ?? "").slice(0, 200), d: !!i.d }))
    .filter((i) => i.t.trim());
  const { supabase } = await db();
  await supabase.from("planner_tasks").update({ checklist: clean }).eq("id", id);
  revalidatePath("/app", "layout");
}

/** Make a task repeat (creates a rule from it) or stop repeating ("none"). */
export async function setRepeat(id: string, rule: string) {
  const { supabase, user } = await db();
  const { data: task } = await supabase
    .from("planner_tasks")
    .select("id, title, day, tag, recur_id")
    .eq("id", id)
    .maybeSingle();
  if (!task) return;
  const today = todayBangkok();

  if (task.recur_id) {
    // stop the old rule and remove its future, unfinished copies
    await supabase.from("planner_recurring").update({ active: false }).eq("id", task.recur_id);
    await supabase
      .from("planner_tasks")
      .delete()
      .eq("recur_id", task.recur_id)
      .eq("done", false)
      .gt("day", task.day > today ? task.day : today)
      .neq("id", task.id);
    await supabase.from("planner_tasks").update({ recur_id: null }).eq("id", task.id);
  }
  if (isRule(rule)) {
    const { data: r } = await supabase
      .from("planner_recurring")
      .insert({
        user_id: user.id,
        title: task.title,
        tag: task.tag,
        rule,
        weekday: weekdayIdx(task.day),
        month_day: Number(task.day.slice(8, 10)),
        last_generated: task.day,
      })
      .select("id")
      .single();
    if (r) {
      await supabase.from("planner_tasks").update({ recur_id: r.id }).eq("id", task.id);
      await ensureRecurring(user.id, addDays(today, 6));
    }
  }
  revalidatePath("/app", "layout");
}

// ---------- custom categories ----------
export async function createTag(form: FormData): Promise<{ id: string | null }> {
  const name = String(form.get("name") ?? "").trim().slice(0, 30);
  const colorIn = form.get("color");
  if (!name) return { id: null };
  const { supabase, user } = await db();
  const { data } = await supabase
    .from("planner_tags")
    .insert({ user_id: user.id, name, color: isColor(colorIn) ? colorIn : "slate" })
    .select("id")
    .single();
  revalidatePath("/app", "layout");
  return { id: data?.id ?? null };
}

export async function updateTag(form: FormData) {
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim().slice(0, 30);
  const colorIn = form.get("color");
  if (!name) return;
  const { supabase } = await db();
  await supabase.from("planner_tags").update({ name, ...(isColor(colorIn) ? { color: colorIn } : {}) }).eq("id", id);
  revalidatePath("/app", "layout");
}

/** Deletes a category; its tasks simply become uncategorised. */
export async function deleteTag(id: string) {
  const { supabase } = await db();
  const { data: own } = await supabase.from("planner_tags").select("id").eq("id", id).maybeSingle();
  if (!own) return;
  await supabase.from("planner_tasks").update({ tag: null }).eq("tag", id);
  await supabase.from("planner_recurring").update({ tag: null }).eq("tag", id);
  await supabase.from("planner_tags").delete().eq("id", id);
  revalidatePath("/app", "layout");
}

// ---------- habits ----------
export async function addHabit(form: FormData) {
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) return;
  const emoji = String(form.get("emoji") ?? "").trim().slice(0, 8) || null;
  const { supabase, user } = await db();
  await supabase.from("planner_habits").insert({ user_id: user.id, name, emoji });
  revalidatePath("/app", "layout");
}

export async function toggleHabit(habitId: string, day: string, on: boolean) {
  if (!isDay(day) || day > todayBangkok()) return;
  const { supabase, user } = await db();
  if (on) await supabase.from("planner_habit_logs").insert({ habit_id: habitId, user_id: user.id, day });
  else await supabase.from("planner_habit_logs").delete().eq("habit_id", habitId).eq("day", day);
  revalidatePath("/app", "layout");
}

export async function archiveHabit(habitId: string) {
  const { supabase } = await db();
  await supabase.from("planner_habits").update({ active: false }).eq("id", habitId);
  revalidatePath("/app", "layout");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
