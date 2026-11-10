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
import { HabitsCard, type HabitData } from "./habits-card";
import { PlanRow, RolloverAllButtons } from "./plan-row";
import { CloseDayCard } from "./close-day-card";
import { ensureRecurring, addDays } from "@/lib/tasks";

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
  await ensureRecurring(user.id, addDays(today, 6));
  // Today's tasks + unfinished one-off tasks from earlier days (auto carry-over;
  // a missed repeating task does not pile up — the next copy is already scheduled)
  const [{ data }, { data: habitRows }, { data: dayNote }] = await Promise.all([
    supabase
      .from("planner_tasks")
      .select("id, title, day, is_priority, done, start_at, end_at, gcal_event_id, notes, tag, checklist, recur_id, recur:planner_recurring(rule, active)")
      .or(`day.eq.${today},and(day.lt.${today},done.eq.false,recur_id.is.null)`)
      .order("created_at"),
    supabase
      .from("planner_habits")
      .select("id, name, emoji, planner_habit_logs(day)")
      .eq("active", true)
      .gte("planner_habit_logs.day", addDays(today, -90))
      .order("created_at"),
    supabase.from("planner_day_notes").select("mood, note").eq("day", today).maybeSingle(),
  ]);
  const tags = await getTags(supabase);
  const tasks = (data ?? []).map((t) => ({
    ...t,
    ...(() => {
      const r = t.recur as unknown as { rule?: string; active?: boolean } | null;
      // a stopped rule no longer counts as repeating
      return r?.active ? { rule: r.rule ?? null } : { rule: null, recur_id: null };
    })(),
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
  const now = Date.now();
  const agenda = [
    ...otherEvents.map((e) => ({
      key: e.id,
      start: e.start.dateTime ?? `${today}T00:00:00+07:00`,
      end: e.end.dateTime ?? `${today}T23:59:59+07:00`,
      allDay: !e.start.dateTime,
      label: e.summary ?? "(ไม่มีชื่อ)",
      kind: "event" as const,
    })),
    ...tasks
      .filter((t) => t.start_at && t.end_at && t.day === today)
      .map((t) => ({
        key: t.id,
        start: t.start_at!,
        end: t.end_at!,
        allDay: false,
        label: t.title,
        kind: t.done ? ("done" as const) : ("task" as const),
      })),
  ].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  // the item happening now, or else the next one coming up
  const focusKey =
    agenda.find((a) => !a.allDay && Date.parse(a.start) <= now && now < Date.parse(a.end))?.key ??
    agenda.find((a) => !a.allDay && Date.parse(a.start) > now)?.key;

  const priorityAll = tasks.filter((t) => t.is_priority && (t.day === today || !t.done));
  const carried = tasks.filter((t) => t.day! < today && !t.is_priority);
  const others = tasks.filter((t) => t.day === today && !t.is_priority && !t.done);
  const done = tasks.filter((t) => t.done && !t.is_priority);
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(new Date()));
  const greeting = hour < 12 ? "สวัสดีตอนเช้า ☀️" : hour < 17 ? "สวัสดีตอนบ่าย 🌤️" : "สวัสดีตอนเย็น 🌙";
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";
  const cal = !!token;
  // "ปิดวัน" shows from 17:00 (or once something was written for today)
  const showCloseDay = hour >= 17 || !!(dayNote?.mood || dayNote?.note);
  const todays = tasks.filter((t) => t.day === today);

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:py-8">
      <AppNav active="today" />

      {/* header */}
      <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">
            {greeting}
            {firstName && `, ${firstName}`}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">{thaiLongDate(today)}</h1>
        </div>
        {tasks.length > 0 && (
          <div className="w-full sm:w-56">
            <div className="flex justify-between text-xs text-stone-500">
              <span>ความคืบหน้าวันนี้</span>
              <span className="font-semibold text-stone-700">
                {doneCount}/{tasks.length} งาน
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </header>

      {access.status === "trial" && (
        <Link
          href="/activate"
          className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200"
        >
          <span>⏳ ทดลองใช้เหลือ {access.daysLeft} วัน</span>
          <span className="font-semibold underline">ใส่ license key</span>
        </Link>
      )}

      {/* quick add */}
      <form action={addTask} className="mt-5 flex gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-emerald-500">
        <input
          name="title"
          required
          maxLength={500}
          placeholder="เพิ่มงาน… เช่น ประชุมลูกค้า พรุ่งนี้ บ่าย 2"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 outline-none placeholder:text-stone-400"
        />
        <button className="rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700">เพิ่ม</button>
      </form>
      <p className="mt-1.5 px-2 text-xs text-stone-400">พิมพ์วัน/เวลาภาษาไทยได้เลย ระบบลงปฏิทินให้อัตโนมัติ</p>

      {showCloseDay && (
        <CloseDayCard
          done={todays.filter((t) => t.done).length}
          total={todays.length}
          left={tasks.filter((t) => !t.done && !t.recur_id).length}
          mood={dayNote?.mood ?? null}
          note={dayNote?.note ?? null}
        />
      )}

      <div className="mt-6 flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_340px] md:items-start lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* 1. top 3 */}
        <section className="order-1 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 md:col-start-1">
          <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-white px-4 py-3">
            <h2 className="font-semibold">🎯 3 งานสำคัญวันนี้</h2>
            <span className="text-xs text-stone-500">{priorityAll.filter((t) => t.done).length}/{priorityAll.length || 3} เสร็จ</span>
          </div>
          <ul className="divide-y divide-stone-100">
            {priorityAll.slice(0, 3).map((t, i) => (
              <TaskRow key={t.id} task={t} calendar={cal} tags={tags} index={i + 1} showDay={t.day! < today} />
            ))}
            {Array.from({ length: Math.max(0, 3 - priorityAll.length) }, (_, i) => (
              <li key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3 text-sm text-stone-400">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-stone-300 text-xs">
                  {priorityAll.length + i + 1}
                </span>
                กด ☆ ที่งานด้านล่างเพื่อเลือกเป็นงานสำคัญ
              </li>
            ))}
          </ul>
        </section>

        {/* 2. side column: schedule + habits (iPad/desktop: right, sticky) */}
        <aside className="order-2 flex flex-col gap-6 md:sticky md:top-6 md:col-start-2 md:row-span-3 md:row-start-1">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">🗓️ ตารางวันนี้</h2>
              {cal && <span className="text-xs text-stone-400">Google Calendar</span>}
            </div>
            {!cal ? (
              <div className="mt-3 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
                <p>เชื่อม Google Calendar เพื่อดูนัดวันนี้และลงเวลางานอัตโนมัติ</p>
                <div className="mt-2">
                  <GoogleButton label="เชื่อม Calendar" variant="subtle" />
                </div>
              </div>
            ) : calendarError ? (
              <p className="mt-3 text-sm text-red-600">ดึงข้อมูลปฏิทินไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>
            ) : agenda.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">ว่างทั้งวัน — แตะงานแล้วตั้งเวลาเพื่อลงปฏิทิน</p>
            ) : (
              <ol className="relative mt-3 space-y-1 before:absolute before:bottom-2 before:left-[3.25rem] before:top-2 before:w-px before:bg-stone-200">
                {agenda.map((a) => {
                  const past = !a.allDay && Date.parse(a.end) <= now;
                  const focus = a.key === focusKey;
                  return (
                    <li key={a.key} className={`relative flex items-start gap-3 rounded-lg py-1.5 pr-2 ${focus ? "bg-emerald-50" : ""}`}>
                      <span className={`w-11 shrink-0 pl-1 pt-0.5 text-right font-mono text-xs ${past ? "text-stone-300" : "text-stone-500"}`}>
                        {a.allDay ? "ทั้งวัน" : hhmm(a.start)}
                      </span>
                      <span
                        className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${
                          a.kind === "event" ? "bg-sky-400" : a.kind === "done" ? "bg-stone-300" : "bg-emerald-500"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${
                            a.kind === "done" ? "text-stone-400 line-through" : past ? "text-stone-400" : a.kind === "task" ? "font-medium text-stone-800" : "text-stone-700"
                          }`}
                        >
                          {a.label}
                        </span>
                        {!a.allDay && (
                          <span className="text-xs text-stone-400">
                            {hhmm(a.start)}–{hhmm(a.end)}
                            {focus && (
                              <span className="ml-1.5 font-semibold text-emerald-700">
                                {Date.parse(a.start) <= now ? "• กำลังทำ" : "• ถัดไป"}
                              </span>
                            )}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <HabitsCard habits={habits} today={today} />
        </aside>

        {/* 3. other tasks */}
        <section className="order-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 md:col-start-1">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="font-semibold">📋 งานอื่นๆ</h2>
            <span className="text-xs text-stone-500">{others.length + carried.length} งาน</span>
          </div>
          {carried.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 bg-amber-50/60 px-4 py-2">
                <p className="text-xs text-amber-900">
                  <span className="font-semibold">ค้างจากวันก่อน {carried.length} งาน</span> — ไม่เป็นไร เลือกได้ว่าจะทำต่อเมื่อไร
                </p>
                {carried.length > 1 && <RolloverAllButtons />}
              </div>
              <ul className="divide-y divide-stone-100">
                {carried.map((t) => (
                  <PlanRow key={t.id} task={t} calendar={cal} tags={tags} mode="carried" />
                ))}
              </ul>
            </>
          )}
          <ul className="divide-y divide-stone-100 border-t border-stone-100">
            {others.length === 0 && carried.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-stone-400">ไม่มีงานอื่น — เพิ่มงานจากช่องด้านบนได้เลย</li>
            )}
            {others.map((t) => (
              <TaskRow key={t.id} task={t} calendar={cal} tags={tags} />
            ))}
          </ul>
        </section>

        {/* 4. done (collapsed) */}
        {done.length > 0 && (
          <details className="group order-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 md:col-start-1">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-stone-600">
              <span>✅ เสร็จแล้ว ({done.length})</span>
              <span className="text-stone-400 transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <ul className="divide-y divide-stone-100 border-t border-stone-100">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} calendar={cal} tags={tags} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </main>
  );
}
