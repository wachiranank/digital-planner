import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess, thaiLongDate, todayBangkok } from "@/lib/access";
import { getAccessToken, hhmm, listDayEvents, type GEvent } from "@/lib/google";
import { GoogleButton } from "../google-button";
import { addTask } from "./actions";
import { getTags } from "@/lib/tags-server";
import { AppNav } from "./nav";
import { TaskRow, type Task } from "./task-row";
import { NotifyCard } from "./notify-card";
import { HabitsCard, type HabitData } from "./habits-card";
import { ensureRecurring, addDays } from "@/lib/tasks";
import { LineCard } from "./line-card";
import { lineBotId, lineConfigured } from "@/lib/line";

export const dynamic = "force-dynamic";

export default async function PlannerToday() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const access = await getAccess(user.id, user.email);
  if (access.status === "expired") redirect("/activate");

  const today = todayBangkok();
  const { data: prefs } = await supabase
    .from("planner_profiles")
    .select("remind_minutes, daily_digest, line_user_id, line_notify")
    .eq("user_id", user.id)
    .maybeSingle();
  const vapidKey = process.env.VAPID_PUBLIC_KEY ?? "";
  await ensureRecurring(user.id, addDays(today, 6));
  // Today's tasks + unfinished one-off tasks from earlier days (auto carry-over;
  // a missed repeating task does not pile up — the next copy is already scheduled)
  const [{ data }, { data: habitRows }] = await Promise.all([
    supabase
      .from("planner_tasks")
      .select("id, title, day, is_priority, done, start_at, end_at, gcal_event_id, notes, tag, checklist, recur_id, recur:planner_recurring(rule)")
      .or(`day.eq.${today},and(day.lt.${today},done.eq.false,recur_id.is.null)`)
      .order("created_at"),
    supabase
      .from("planner_habits")
      .select("id, name, emoji, planner_habit_logs(day)")
      .eq("active", true)
      .gte("planner_habit_logs.day", addDays(today, -90))
      .order("created_at"),
  ]);
  const tags = await getTags(supabase);
  const tasks = (data ?? []).map((t) => ({
    ...t,
    rule: (t.recur as unknown as { rule?: string } | null)?.rule ?? null,
  })) as Task[];
  const habits: HabitData[] = (habitRows ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    days: ((h.planner_habit_logs ?? []) as { day: string }[]).map((l) => l.day),
  }));

  // ---- Google Calendar: read today's events and pull changes made in Google ----
  const token = await getAccessToken(user.id);
  let events: GEvent[] = [];
  let calendarError = false;
  if (token) {
    try {
      events = await listDayEvents(token, today);
      const byId = new Map(events.map((e) => [e.id, e]));
      for (const t of tasks) {
        if (!t.gcal_event_id || t.day !== today) continue;
        const ev = byId.get(t.gcal_event_id);
        if (!ev) {
          // deleted (or moved to another day) in Google → drop the time block here
          await supabase.from("planner_tasks").update({ start_at: null, end_at: null, gcal_event_id: null }).eq("id", t.id);
          Object.assign(t, { start_at: null, end_at: null, gcal_event_id: null });
        } else if (ev.start.dateTime && ev.end.dateTime) {
          // moved/resized in Google → follow it (compare instants, not string formats)
          const ms = (s: string | null) => (s ? new Date(s).getTime() : NaN);
          if (ms(ev.start.dateTime) !== ms(t.start_at) || ms(ev.end.dateTime) !== ms(t.end_at)) {
            const start_at = new Date(ev.start.dateTime).toISOString();
            const end_at = new Date(ev.end.dateTime).toISOString();
            await supabase.from("planner_tasks").update({ start_at, end_at }).eq("id", t.id);
            Object.assign(t, { start_at, end_at });
          }
        }
      }
    } catch {
      calendarError = true;
    }
  }
  const taskEventIds = new Set(tasks.map((t) => t.gcal_event_id).filter(Boolean));
  const otherEvents = events.filter((e) => !taskEventIds.has(e.id));
  const agenda = [
    ...otherEvents.map((e) => ({
      key: e.id,
      start: e.start.dateTime ?? `${today}T00:00:00+07:00`,
      label: e.summary ?? "(ไม่มีชื่อ)",
      time: e.start.dateTime ? `${hhmm(e.start.dateTime)}–${hhmm(e.end.dateTime!)}` : "ทั้งวัน",
      kind: "event" as const,
    })),
    ...tasks
      .filter((t) => t.start_at && t.end_at && t.day === today)
      .map((t) => ({
        key: t.id,
        start: t.start_at!,
        label: t.title,
        time: `${hhmm(t.start_at!)}–${hhmm(t.end_at!)}`,
        kind: t.done ? ("done" as const) : ("task" as const),
      })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const priorities = tasks.filter((t) => t.is_priority && !t.done);
  const carried = tasks.filter((t) => t.day < today && !t.is_priority);
  const others = tasks.filter((t) => t.day === today && !t.is_priority && !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 md:py-10">
      <AppNav active="today" />
      <div className="mt-4">
        <p className="text-sm text-stone-500">วันนี้</p>
        <h1 className="text-2xl font-bold">{thaiLongDate(today)}</h1>
      </div>

      {access.status === "trial" && (
        <Link href="/activate" className="mt-4 block rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ทดลองใช้เหลือ {access.daysLeft} วัน — กดเพื่อใส่ license key
        </Link>
      )}
      {!token && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
          <span>เชื่อม Google Calendar เพื่อดูนัดวันนี้และลงเวลางานลงปฏิทินอัตโนมัติ</span>
          <GoogleButton label="เชื่อม Calendar" variant="subtle" />
        </div>
      )}

      {/* iPad / desktop: tasks left, today's schedule right. Phone: stacked, schedule first */}
      <div className="md:grid md:grid-cols-[minmax(0,1fr)_320px] md:gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="md:order-2">
          {token && (
            <section className="mt-6 md:sticky md:top-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                ตารางวันนี้ <span className="font-normal normal-case">· Google Calendar</span>
              </h2>
              {calendarError && <p className="mt-2 text-sm text-red-600">ดึงข้อมูลปฏิทินไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>}
              <ol className="mt-2 rounded-xl bg-white ring-1 ring-stone-200">
                {agenda.length === 0 && (
                  <li className="px-4 py-3 text-sm text-stone-400">ไม่มีนัดวันนี้ — กด ⏰ ที่งานเพื่อลงเวลา</li>
                )}
                {agenda.map((a) => (
                  <li key={a.key} className="flex gap-3 border-b border-stone-100 px-4 py-2.5 last:border-0">
                    <span className="w-24 shrink-0 font-mono text-sm text-stone-500">{a.time}</span>
                    <span
                      className={
                        a.kind === "event"
                          ? "text-stone-700"
                          : a.kind === "done"
                            ? "text-stone-400 line-through"
                            : "font-medium text-emerald-700"
                      }
                    >
                      {a.label}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          )}
          <HabitsCard habits={habits} today={today} />
          {vapidKey && (
            <NotifyCard
              vapidKey={vapidKey}
              remindMinutes={prefs?.remind_minutes ?? 10}
              dailyDigest={prefs?.daily_digest ?? true}
            />
          )}
          {lineConfigured() && lineBotId() && (
            <LineCard linked={!!prefs?.line_user_id} notify={prefs?.line_notify ?? true} botId={lineBotId()} />
          )}
        </div>

        <div className="md:order-1">
          <form action={addTask} className="mt-6 flex gap-2">
            <input
              name="title"
              required
              maxLength={500}
              placeholder="เพิ่มงาน… เช่น ประชุมลูกค้า พรุ่งนี้ บ่าย 2"
              className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3"
            />
            <button className="rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700">เพิ่ม</button>
          </form>

          <Section title={`งานสำคัญ (${priorities.length}/3)`} hint="กด ☆ ที่งานเพื่อเลือกเป็นงานสำคัญของวัน">
            {priorities.map((t) => (
              <TaskRow key={t.id} task={t} calendar={!!token} tags={tags} />
            ))}
          </Section>

          {carried.length > 0 && (
            <Section title={`ยกมาจากวันก่อน (${carried.length})`}>
              {carried.map((t) => (
                <TaskRow key={t.id} task={t} calendar={!!token} tags={tags} />
              ))}
            </Section>
          )}

          <Section title="งานอื่นวันนี้">
            {others.map((t) => (
              <TaskRow key={t.id} task={t} calendar={!!token} tags={tags} />
            ))}
          </Section>

          {done.length > 0 && (
            <Section title={`เสร็จแล้ว (${done.length})`}>
              {done.map((t) => (
                <TaskRow key={t.id} task={t} calendar={!!token} tags={tags} />
              ))}
            </Section>
          )}
        </div>
      </div>
    </main>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const empty = Array.isArray(children) && children.length === 0;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">{title}</h2>
      <ul className="mt-2 divide-y divide-stone-200 rounded-xl bg-white ring-1 ring-stone-200">
        {empty ? <li className="px-4 py-3 text-sm text-stone-400">{hint ?? "ยังไม่มีงาน"}</li> : children}
      </ul>
    </section>
  );
}
