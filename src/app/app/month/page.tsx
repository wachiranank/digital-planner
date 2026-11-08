import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess, thaiLongDate, todayBangkok } from "@/lib/access";
import { eventDay, getAccessToken, hhmm, listRangeEvents, type GEvent } from "@/lib/google";
import { addDays, ensureRecurring, weekdayIdx } from "@/lib/tasks";
import { getTags } from "@/lib/tags-server";
import { findTag, tagStyle } from "@/lib/tags";
import { addTask } from "../actions";
import { AppNav } from "../nav";
import { WeekTask, type WeekTaskData } from "../week/week-task";

export const dynamic = "force-dynamic";

const WEEKDAY_HEAD = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const monthTitle = (first: string) =>
  new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${first}T12:00:00Z`),
  );

/** First day (YYYY-MM-01) of the month `offset` months from `today`. */
function monthStart(today: string, offset: number) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1 + offset;
  const d = new Date(Date.UTC(y, m, 1, 12));
  return d.toISOString().slice(0, 10);
}

export default async function Month({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const access = await getAccess(user.id, user.email);
  if (access.status === "expired") redirect("/activate");

  const sp = await searchParams;
  const offset = Math.max(-24, Math.min(24, Number(sp.m ?? 0) || 0));
  const today = todayBangkok();
  const first = monthStart(today, offset);
  const nextFirst = monthStart(today, offset + 1);
  const gridStart = addDays(first, -weekdayIdx(first));
  const weeks = Math.ceil((weekdayIdx(first) + Math.round((Date.parse(nextFirst) - Date.parse(first)) / 864e5)) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  const gridEnd = days[days.length - 1];

  const inMonth = (d: string) => d >= first && d < nextFirst;
  const selected = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && days.includes(sp.d) ? sp.d : inMonth(today) ? today : first;

  // repeating tasks for the visible range (no further than ~2 months ahead)
  const cap = addDays(today, 62);
  const until = gridEnd < cap ? gridEnd : cap;
  if (until >= today) await ensureRecurring(user.id, until);

  const [{ data }, tags] = await Promise.all([
    supabase
      .from("planner_tasks")
      .select("id, title, day, is_priority, done, start_at, end_at, gcal_event_id, tag, recur_id")
      .gte("day", gridStart)
      .lte("day", gridEnd)
      .order("start_at", { ascending: true, nullsFirst: false })
      .order("created_at"),
    getTags(supabase),
  ]);
  const tasks = (data ?? []) as WeekTaskData[];

  const token = await getAccessToken(user.id);
  let events: GEvent[] = [];
  if (token) {
    try {
      events = await listRangeEvents(token, gridStart, gridEnd);
    } catch {
      events = [];
    }
  }
  const taskEventIds = new Set(tasks.map((t) => t.gcal_event_id).filter(Boolean));
  const otherEvents = events.filter((e) => !taskEventIds.has(e.id));

  const selTasks = tasks.filter((t) => t.day === selected);
  const selEvents = otherEvents.filter((e) => eventDay(e) === selected);
  const selWeek = Array.from({ length: 7 }, (_, i) => addDays(selected, i - weekdayIdx(selected)));
  const href = (d: string) => `/app/month?${offset ? `m=${offset}&` : ""}d=${d}`;

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-6 md:py-10">
      <AppNav active="month" />

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{offset === 0 ? "เดือนนี้" : offset > 0 ? `อีก ${offset} เดือน` : `${-offset} เดือนก่อน`}</p>
          <h1 className="text-2xl font-bold">{monthTitle(first)}</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/app/month?m=${offset - 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
            ‹ ก่อนหน้า
          </Link>
          {offset !== 0 && (
            <Link href="/app/month" className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
              เดือนนี้
            </Link>
          )}
          <Link href={`/app/month?m=${offset + 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
            ถัดไป ›
          </Link>
        </div>
      </header>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
        {/* calendar grid */}
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-semibold text-stone-500">
            {WEEKDAY_HEAD.map((w, i) => (
              <div key={w} className={`py-2 ${i >= 5 ? "text-rose-500" : ""}`}>
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const dt = tasks.filter((t) => t.day === d);
              const de = otherEvents.filter((e) => eventDay(e) === d);
              const items = [
                ...de.map((e) => ({ key: e.id, label: e.summary ?? "(ไม่มีชื่อ)", dot: "bg-sky-400", done: false, event: true })),
                ...dt.map((t) => {
                  const st = tagStyle(findTag(tags, t.tag));
                  return { key: t.id, label: t.title, dot: st?.dot ?? "bg-stone-400", done: t.done, event: false };
                }),
              ];
              const isSel = d === selected;
              const isToday = d === today;
              return (
                <Link
                  key={d}
                  href={href(d)}
                  scroll={false}
                  className={`min-h-16 border-b border-r border-stone-100 p-1 text-left align-top sm:min-h-24 md:min-h-28 ${
                    inMonth(d) ? "" : "bg-stone-50/70 text-stone-400"
                  } ${isSel ? "bg-emerald-50 ring-2 ring-inset ring-emerald-500" : "hover:bg-stone-50"}`}
                  aria-label={thaiLongDate(d)}
                >
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                      isToday ? "bg-emerald-600 text-white" : ""
                    }`}
                  >
                    {Number(d.slice(8, 10))}
                  </span>
                  {/* phone: dots only */}
                  <div className="mt-0.5 flex flex-wrap gap-0.5 sm:hidden">
                    {items.slice(0, 6).map((it) => (
                      <span key={it.key} className={`h-1.5 w-1.5 rounded-full ${it.dot} ${it.done ? "opacity-30" : ""}`} />
                    ))}
                  </div>
                  {/* iPad / desktop: titles */}
                  <ul className="mt-0.5 hidden space-y-0.5 sm:block">
                    {items.slice(0, 3).map((it) => (
                      <li
                        key={it.key}
                        className={`flex items-center gap-1 truncate text-[11px] leading-4 ${it.event ? "text-sky-800" : ""} ${
                          it.done ? "text-stone-400 line-through" : ""
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${it.dot}`} />
                        <span className="truncate">{it.label}</span>
                      </li>
                    ))}
                    {items.length > 3 && <li className="text-[11px] text-stone-500">+{items.length - 3} อื่นๆ</li>}
                  </ul>
                </Link>
              );
            })}
          </div>
        </div>

        {/* selected day */}
        <section className="mt-6 rounded-xl bg-white p-4 ring-1 ring-stone-200 lg:sticky lg:top-6 lg:mt-0 lg:self-start">
          <h2 className="font-semibold">{thaiLongDate(selected)}</h2>
          {selEvents.length > 0 && (
            <ul className="mt-3 space-y-1">
              {selEvents.map((e) => (
                <li key={e.id} className="rounded-md bg-sky-50 px-2 py-1 text-sm text-sky-900">
                  <span className="font-mono text-xs">{e.start.dateTime ? hhmm(e.start.dateTime) : "ทั้งวัน"}</span> {e.summary ?? "(ไม่มีชื่อ)"}
                </li>
              ))}
            </ul>
          )}
          <ul className="mt-3 space-y-1">
            {selTasks.length === 0 && selEvents.length === 0 && <li className="text-sm text-stone-400">ยังไม่มีงานวันนี้</li>}
            {selTasks.map((t) => (
              <WeekTask key={t.id} task={t} days={selWeek} tags={tags} />
            ))}
          </ul>
          <form action={addTask} className="mt-3 flex gap-2">
            <input type="hidden" name="day" value={selected} />
            <input
              name="title"
              required
              maxLength={500}
              placeholder="+ เพิ่มงาน เช่น ประชุม 10 โมง"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white">เพิ่ม</button>
          </form>
          <Link href={`/app/week?w=${Math.round((Date.parse(selWeek[0]) - Date.parse(addDays(today, -weekdayIdx(today)))) / (7 * 864e5))}`} className="mt-3 inline-block text-sm text-emerald-700 underline">
            ดูสัปดาห์นี้ →
          </Link>
        </section>
      </div>
    </main>
  );
}
