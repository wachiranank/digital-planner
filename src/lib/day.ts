import "server-only";
// Daily routine helpers shared by the app, the LINE bot and the cron job:
// morning planning (pick today's top 3 by number) and closing the day.
import { supabaseAdmin } from "./supabase/server";
import { getAccessToken, patchEvent } from "./google";
import { addDays } from "./tasks";
import { moodEmoji } from "./moods";

export type OpenTask = {
  id: string;
  title: string;
  day: string;
  is_priority: boolean;
  start_at: string | null;
  end_at: string | null;
  gcal_event_id: string | null;
  recur_id: string | null;
};

const hm = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));

/**
 * Unfinished tasks for today in a stable order, so "สำคัญ 1 3" in LINE refers to the
 * same numbers the morning message showed. Same set as the Today page: today's tasks
 * plus one-off tasks left over from earlier days (a missed repeating copy doesn't pile up).
 */
export async function openForToday(userId: string, today: string): Promise<OpenTask[]> {
  const { data } = await supabaseAdmin()
    .from("planner_tasks")
    .select("id, title, day, is_priority, start_at, end_at, gcal_event_id, recur_id")
    .eq("user_id", userId)
    .eq("done", false)
    .or(`day.eq.${today},and(day.lt.${today},recur_id.is.null)`)
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("created_at")
    .order("id");
  return (data ?? []) as OpenTask[];
}

/** Numbered list for LINE: "1. ★ 10:00 ประชุม" */
export const numbered = (list: OpenTask[], today: string) =>
  list
    .map(
      (t, i) =>
        `${i + 1}. ${t.is_priority ? "★ " : ""}${t.start_at && t.day === today ? `${hm(t.start_at)} ` : ""}${t.title}${
          t.day < today ? " (ค้าง)" : ""
        }`,
    )
    .join("\n");

/** Moves a task to another day; a time-blocked task keeps its clock time and its Google event moves too. */
export async function shiftTaskDay(
  userId: string,
  task: { id: string; day: string | null; start_at: string | null; end_at: string | null; gcal_event_id: string | null },
  newDay: string,
) {
  if (task.day === newDay) return;
  const update: Record<string, unknown> = { day: newDay };
  if (task.day && task.start_at && task.end_at) {
    const shift = Date.parse(`${newDay}T00:00:00+07:00`) - Date.parse(`${task.day}T00:00:00+07:00`);
    const start = new Date(Date.parse(task.start_at) + shift).toISOString();
    const end = new Date(Date.parse(task.end_at) + shift).toISOString();
    Object.assign(update, { start_at: start, end_at: end, reminded_at: null });
    if (task.gcal_event_id) {
      const token = await getAccessToken(userId);
      if (token) {
        await patchEvent(token, task.gcal_event_id, {
          start: { dateTime: start, timeZone: "Asia/Bangkok" },
          end: { dateTime: end, timeZone: "Asia/Bangkok" },
        }).catch(() => {});
      }
    }
  }
  await supabaseAdmin().from("planner_tasks").update(update).eq("id", task.id).eq("user_id", userId);
}

/**
 * Morning planning: makes tasks #n (from openForToday) today's top 3, replacing the old picks.
 * A chosen leftover task moves to today. Returns the chosen tasks, or null if no number was valid.
 */
export async function setTopByNumber(userId: string, today: string, nums: number[]) {
  const list = await openForToday(userId, today);
  const picked = [...new Set(nums)]
    .filter((n) => n >= 1 && n <= list.length)
    .slice(0, 3)
    .map((n) => list[n - 1]);
  if (picked.length === 0) return null;
  const admin = supabaseAdmin();
  const ids = picked.map((t) => t.id);
  const drop = list.filter((t) => t.is_priority && !ids.includes(t.id)).map((t) => t.id);
  if (drop.length) await admin.from("planner_tasks").update({ is_priority: false }).in("id", drop).eq("user_id", userId);
  for (const t of picked) if (t.day < today) await shiftTaskDay(userId, t, today);
  await admin.from("planner_tasks").update({ is_priority: true }).in("id", ids).eq("user_id", userId);
  return picked;
}

/** Evening: one-off unfinished tasks of today (and leftovers) → tomorrow. Repeating ones already have tomorrow's copy. */
export async function moveLeftoversToTomorrow(userId: string, today: string) {
  const list = (await openForToday(userId, today)).filter((t) => !t.recur_id);
  const tomorrow = addDays(today, 1);
  for (const t of list) await shiftTaskDay(userId, t, tomorrow);
  return list.length;
}

export async function dayStats(userId: string, today: string) {
  const admin = supabaseAdmin();
  const [{ data: todays }, open, { data: note }] = await Promise.all([
    admin.from("planner_tasks").select("done").eq("user_id", userId).eq("day", today),
    openForToday(userId, today),
    admin.from("planner_day_notes").select("mood, note").eq("user_id", userId).eq("day", today).maybeSingle(),
  ]);
  const total = todays?.length ?? 0;
  const done = (todays ?? []).filter((t) => t.done).length;
  return { total, done, open, note: note as { mood: number | null; note: string | null } | null };
}

/** Saves today's mood and/or note (only the fields given are changed). */
export async function saveDayNote(userId: string, day: string, v: { mood?: number | null; note?: string | null }) {
  const row: Record<string, unknown> = { user_id: userId, day, updated_at: new Date().toISOString() };
  if (v.mood !== undefined) row.mood = v.mood && v.mood >= 1 && v.mood <= 5 ? v.mood : null;
  if (v.note !== undefined) row.note = v.note?.slice(0, 2000).trim() || null;
  await supabaseAdmin().from("planner_day_notes").upsert(row, { onConflict: "user_id,day" });
}

// ---------- message texts (LINE) ----------
export function morningText(list: OpenTask[], today: string) {
  if (list.length === 0) return "วันนี้ยังไม่มีงาน — พิมพ์ \"เพิ่ม ...\" หรือเปิดแอปเพื่อวางแผนวันของคุณ";
  const carried = list.filter((t) => t.day < today).length;
  const hasTop = list.some((t) => t.is_priority);
  return [
    `วันนี้มี ${list.length} งาน${carried ? ` (ค้างจากก่อนหน้า ${carried})` : ""}`,
    numbered(list, today),
    "",
    hasTop
      ? "★ = งานสำคัญที่เลือกไว้ · เปลี่ยนได้โดยตอบ \"สำคัญ\" ตามด้วยเลข"
      : `🎯 เลือก 3 งานสำคัญ: ตอบ "สำคัญ" ตามด้วยเลข เช่น สำคัญ ${list
          .slice(0, 3)
          .map((_, i) => i + 1)
          .join(" ")}`,
  ].join("\n");
}

export function eveningText(s: Awaited<ReturnType<typeof dayStats>>, today: string) {
  const lines = [
    s.total === 0
      ? "วันนี้ไม่มีงานในแผน"
      : s.done === s.total
        ? `เสร็จครบ ${s.done}/${s.total} งาน เยี่ยมมาก 🎉`
        : `วันนี้เสร็จ ${s.done}/${s.total} งาน 👏`,
  ];
  const oneOff = s.open.filter((t) => !t.recur_id);
  if (oneOff.length) {
    lines.push("", `ยังเหลือ ${oneOff.length} งาน — ไม่เป็นไร:`, numbered(oneOff, today), "", 'ตอบ "ย้ายพรุ่งนี้" เพื่อย้ายไปทำพรุ่งนี้');
  }
  lines.push(
    "",
    s.note?.mood || s.note?.note
      ? `บันทึกวันนี้: ${moodEmoji(s.note.mood)} ${s.note.note ?? ""}`.trim()
      : 'วันนี้เป็นยังไงบ้าง? กดอีโมจิด้านล่าง หรือพิมพ์ "บันทึก ..." สั้นๆ',
  );
  return lines.join("\n");
}
