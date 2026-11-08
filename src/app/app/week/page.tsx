import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess, todayBangkok } from "@/lib/access";
import { eventDay, getAccessToken, hhmm, listRangeEvents, type GEvent } from "@/lib/google";
import { addTask } from "../actions";
import { getTags } from "@/lib/tags-server";
import { AppNav } from "../nav";
import { WeekTask, type WeekTaskData } from "./week-task";
import { ensureRecurring } from "@/lib/tasks";

export const dynamic = "force-dynamic";

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

const fmt = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { timeZone: "UTC", ...opts }).format(new Date(`${day}T12:00:00Z`));

export default async function Week({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const access = await getAccess(user.id, user.email);
  if (access.status === "expired") redirect("/activate");

  const offset = Math.max(-52, Math.min(52, Number((await searchParams).w ?? 0) || 0));
  const today = todayBangkok();
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
  const monday = addDays(today, -weekday + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = days[6];

  // repeating tasks: keep a week ahead, and fill the viewed week (up to ~2 months out)
  const ahead = addDays(today, 6);
  const cap = addDays(today, 62);
  await ensureRecurring(user.id, sunday > ahead ? (sunday < cap ? sunday : cap) : ahead);

  const { data } = await supabase
    .from("planner_tasks")
    .select("id, title, day, is_priority, done, start_at, end_at, gcal_event_id, tag, recur_id, notes, checklist, recur:planner_recurring(rule, active)")
    .gte("day", monday)
    .lte("day", sunday)
    .order("start_at", { ascending: true, nullsFirst: false })
    .order("created_at");
  const tasks = (data ?? []).map((t) => ({
    ...t,
    ...(() => {
      const r = t.recur as unknown as { rule?: string; active?: boolean } | null;
      // a stopped rule no longer counts as repeating
      return r?.active ? { rule: r.rule ?? null } : { rule: null, recur_id: null };
    })(),
  })) as WeekTaskData[];
  const tags = await getTags(supabase);

  const token = await getAccessToken(user.id);
  let events: GEvent[] = [];
  if (token) {
    try {
      events = await listRangeEvents(token, monday, sunday);
    } catch {
      events = [];
    }
  }
  const taskEventIds = new Set(tasks.map((t) => t.gcal_event_id).filter(Boolean));
  const otherEvents = events.filter((e) => !taskEventIds.has(e.id));

  const range = `${fmt(monday, { day: "numeric", month: "short" })} – ${fmt(sunday, { day: "numeric", month: "short", year: "numeric" })}`;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-6 md:py-10">
      <AppNav active="week" />

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{offset === 0 ? "สัปดาห์นี้" : offset > 0 ? `อีก ${offset} สัปดาห์` : `${-offset} สัปดาห์ก่อน`}</p>
          <h1 className="text-2xl font-bold">{range}</h1>
          <p className="text-sm text-stone-500">
            เสร็จแล้ว {doneCount}/{tasks.length} งาน
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/app/week?w=${offset - 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
            ‹ ก่อนหน้า
          </Link>
          {offset !== 0 && (
            <Link href="/app/week" className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
              สัปดาห์นี้
            </Link>
          )}
          <Link href={`/app/week?w=${offset + 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
            ถัดไป ›
          </Link>
        </div>
      </header>

      {/* phone: one column · iPad portrait: 2 · iPad landscape: 4 · desktop: 7 */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const isToday = day === today;
          const dayTasks = tasks.filter((t) => t.day === day);
          const dayEvents = otherEvents.filter((e) => eventDay(e) === day);
          return (
            <section
              key={day}
              className={`flex flex-col rounded-xl bg-white p-3 ring-1 ${isToday ? "ring-2 ring-emerald-500" : "ring-stone-200"}`}
            >
              <h2 className="flex items-baseline justify-between">
                <span className={`font-semibold ${isToday ? "text-emerald-700" : ""}`}>{fmt(day, { weekday: "short" })}</span>
                <span className="text-sm text-stone-500">{fmt(day, { day: "numeric", month: "short" })}</span>
              </h2>

              {dayEvents.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {dayEvents.map((e) => (
                    <li key={e.id} className="rounded-md bg-sky-50 px-2 py-1 text-xs text-sky-900">
                      <span className="font-mono">{e.start.dateTime ? hhmm(e.start.dateTime) : "ทั้งวัน"}</span> {e.summary ?? "(ไม่มีชื่อ)"}
                    </li>
                  ))}
                </ul>
              )}

              <ul className="mt-2 flex-1 space-y-1">
                {dayTasks.map((t) => (
                  <WeekTask key={t.id} task={t} days={days} tags={tags} calendar={!!token} />
                ))}
              </ul>

              <form action={addTask} className="mt-2">
                <input type="hidden" name="day" value={day} />
                <input
                  name="title"
                  required
                  maxLength={500}
                  placeholder="+ เพิ่มงาน"
                  className="w-full rounded-md border border-transparent bg-stone-50 px-2 py-1.5 text-sm placeholder:text-stone-400 focus:border-stone-300 focus:bg-white"
                />
              </form>
            </section>
          );
        })}
      </div>
    </main>
  );
}
