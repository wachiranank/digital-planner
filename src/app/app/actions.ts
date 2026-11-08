"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { todayBangkok } from "@/lib/access";
import { createEvent, deleteEvent, getAccessToken, patchEvent } from "@/lib/google";

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
  const day = isDay(dayInput) ? dayInput : todayBangkok();
  const { supabase } = await db();
  await supabase.from("planner_tasks").insert({ title, day });
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
    Object.assign(update, { start_at: start, end_at: end });
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
    .update({ day, start_at: start.toISOString(), end_at: end.toISOString(), gcal_event_id: eventId })
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

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
