import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess, thaiLongDate, todayBangkok } from "@/lib/access";
import { getAccessToken, hhmm, listDayEvents, type GEvent } from "@/lib/google";
import { GoogleButton } from "../google-button";
import { addTask } from "./actions";
import { getTags } from "@/lib/tags-server";
import { TaskRow, type Task } from "./task-row";
import { DayTimeline, DropToDay, type AgendaItem } from "./day-timeline";
import { InboxColumn } from "./inbox-column";
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
  const [{ data }, { data: habitRows }, { data: dayNote }, { data: inboxRows }] = await Promise.all([
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
    // laptop: the Inbox column
    supabase
      .from("planner_tasks")
      .select("id, title, day, is_priority, done, start_at, end_at, gcal_event_id, notes, tag, checklist, recur_id")
      .is("day", null)
      .eq("done", false)
      .order("created_at", { ascending: false })
      .limit(50),
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
  const agenda: AgendaItem[] = [
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
        taskId: t.id,
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
  const inbox = (inboxRows ?? []) as Task[];

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Bangkok" }).format(new Date()));
  const greeting = hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? "";
  const cal = !!token;
  // "ปิดวัน" is an evening ritual: from 17:00
  const showCloseDay = hour >= 17;
  const todays = tasks.filter((t) => t.day === today);
  // "6 งาน · 3 ชม. 30 นาที · เสร็จ 1"
  const plannedMin = tasks
    .filter((t) => !t.done && t.start_at && t.end_at)
    .reduce((m, t) => m + (Date.parse(t.end_at!) - Date.parse(t.start_at!)) / 60e3, 0);
  const planned =
    plannedMin >= 60 ? `${Math.floor(plannedMin / 60)} ชม.${plannedMin % 60 ? ` ${Math.round(plannedMin % 60)} นาที` : ""}` : plannedMin > 0 ? `${Math.round(plannedMin)} นาที` : "";
  const summary = [`${tasks.length} งาน`, planned, `เสร็จ ${doneCount}`].filter(Boolean).join(" · ");

  const heading = (title: string, right?: React.ReactNode) => (
    <div className="mb-1 mt-7 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-stone-800">{title}</h2>
      {right}
    </div>
  );

  return (
    <div className="lg:flex lg:h-screen">
      {/* laptop xl: Inbox column */}
      <aside aria-label="Inbox" className="hidden border-r border-stone-200 xl:block xl:h-screen xl:w-[300px] xl:shrink-0">
        <InboxColumn tasks={inbox} tags={tags} calendar={cal} today={today} />
      </aside>

      {/* the day */}
      <main className="min-w-0 flex-1 lg:h-screen lg:overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 pb-10 pt-6 lg:px-10 lg:pt-8">
          <header>
            <p className="text-sm text-stone-500">
              {greeting}
              {firstName && ` ${firstName}`} · {thaiLongDate(today)}
            </p>
            <div className="mt-0.5 flex items-end justify-between gap-3">
              <h1 className="text-[32px] font-bold leading-tight tracking-tight">วันนี้</h1>
              {showCloseDay && (
                <a href="#close-day" className="mb-1 rounded-full bg-stone-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-stone-800">
                  ปิดวัน
                </a>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-stone-500">{summary}</p>
            {tasks.length > 0 && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200/70" aria-label={`ความคืบหน้า ${pct}%`}>
                <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
          </header>

          {access.status === "trial" && (
            <Link
              href="/activate"
              className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200"
            >
              <span>ทดลองใช้เหลือ {access.daysLeft} วัน</span>
              <span className="font-semibold underline">ใส่ license key</span>
            </Link>
          )}

          {/* laptop quick add (phones use the "+" button) */}
          <form
            action={addTask}
            className="mt-5 hidden h-12 items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-brand-500 lg:flex"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-brand-600" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            <input
              name="title"
              required
              maxLength={500}
              aria-label="เพิ่มงาน"
              placeholder="เพิ่มงาน… เช่น ประชุมลูกค้า พรุ่งนี้ บ่าย 2"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-stone-400"
            />
            <kbd className="rounded-md bg-stone-100 px-1.5 text-xs text-stone-500">Q</kbd>
          </form>

          {showCloseDay && (
            <CloseDayCard
              done={todays.filter((t) => t.done).length}
              total={todays.length}
              left={tasks.filter((t) => !t.done && !t.recur_id).length}
              mood={dayNote?.mood ?? null}
              note={dayNote?.note ?? null}
            />
          )}

          <DropToDay day={today}>
            {heading(
              "3 งานสำคัญ",
              <span className="text-xs text-stone-500">
                {priorityAll.filter((t) => t.done).length}/{Math.max(3, priorityAll.length)}
              </span>,
            )}
            <ul>
              {priorityAll.slice(0, 3).map((t) => (
                <TaskRow key={t.id} task={t} calendar={cal} tags={tags} showDay={t.day! < today} />
              ))}
            </ul>
            {priorityAll.length < 3 && (
              <p className="py-2 text-[13px] text-stone-400">
                {tasks.length ? "แตะดาวที่งานด้านล่างเพื่อเลือกเป็นงานสำคัญ" : "ยังไม่มีงาน — กดปุ่ม + เพื่อเริ่มวางแผนวันนี้"}
              </p>
            )}

            {carried.length > 0 && (
              <>
                {heading(`ค้างจากวันก่อน · ${carried.length}`, carried.length > 1 ? <RolloverAllButtons /> : undefined)}
                <p className="-mt-0.5 mb-1 text-xs text-stone-500">ไม่เป็นไร เลือกได้ว่าจะทำต่อเมื่อไร</p>
                <ul>
                  {carried.map((t) => (
                    <PlanRow key={t.id} task={t} calendar={cal} tags={tags} mode="carried" />
                  ))}
                </ul>
              </>
            )}

            {heading("งานอื่นๆ", <span className="text-xs text-stone-500">{others.length}</span>)}
            <ul>
              {others.length === 0 && <li className="py-2 text-[13px] text-stone-400">ไม่มีงานอื่น</li>}
              {others.map((t) => (
                <TaskRow key={t.id} task={t} calendar={cal} tags={tags} />
              ))}
            </ul>

            {done.length > 0 && (
              <details className="group mt-6">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[15px] font-semibold text-stone-500">
                  เสร็จแล้ว · {done.length}
                  <span className="transition-transform group-open:rotate-180" aria-hidden>
                    ⌄
                  </span>
                </summary>
                <ul className="mt-1">
                  {done.map((t) => (
                    <TaskRow key={t.id} task={t} calendar={cal} tags={tags} />
                  ))}
                </ul>
              </details>
            )}
          </DropToDay>

          {/* phones/tablets: compact agenda (laptops have the timeline on the right) */}
          <section className="mt-8 rounded-2xl bg-white p-4 ring-1 ring-stone-200 lg:hidden">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">ตารางวันนี้</h2>
              {cal && <span className="text-xs text-stone-500">Google Calendar</span>}
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
              <ol className="mt-3 space-y-1">
                {agenda.map((a) => {
                  const past = !a.allDay && Date.parse(a.end) <= now;
                  const focus = a.key === focusKey;
                  return (
                    <li key={a.key} className={`flex items-start gap-3 rounded-lg px-2 py-1.5 ${focus ? "bg-brand-50" : ""}`}>
                      <span className={`w-11 shrink-0 pt-0.5 text-right text-xs tabular-nums ${past ? "text-stone-400" : "text-stone-600"}`}>
                        {a.allDay ? "ทั้งวัน" : hhmm(a.start)}
                      </span>
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          a.kind === "event" ? "bg-sky-400" : a.kind === "done" ? "bg-stone-300" : "bg-brand-600"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${a.kind === "done" ? "text-stone-400 line-through" : past ? "text-stone-400" : "text-stone-800"}`}>
                          {a.label}
                        </span>
                        {!a.allDay && (
                          <span className="text-xs text-stone-500">
                            {hhmm(a.start)}–{hhmm(a.end)}
                            {focus && <span className="ml-1.5 font-semibold text-brand-700">{Date.parse(a.start) <= now ? "• กำลังทำ" : "• ถัดไป"}</span>}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <div className="mt-6">
            <HabitsCard habits={habits} today={today} />
          </div>
        </div>
      </main>

      {/* laptop: today's timeline */}
      <aside aria-label="ตารางวันนี้" className="hidden h-screen w-[360px] shrink-0 border-l border-stone-200 bg-white lg:block xl:w-[380px]">
        {calendarError ? (
          <p className="p-6 text-sm text-red-600">ดึงข้อมูลปฏิทินไม่สำเร็จ ลองรีเฟรชอีกครั้ง</p>
        ) : (
          <DayTimeline items={agenda} today={today} calendar={cal} />
        )}
      </aside>
    </div>
  );
}
