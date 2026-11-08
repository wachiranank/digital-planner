import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess, todayBangkok } from "@/lib/access";
import { moveOpenToNextWeek, saveReview } from "../actions";
import { AppNav } from "../nav";

export const dynamic = "force-dynamic";

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const fmt = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { timeZone: "UTC", ...opts }).format(new Date(`${day}T12:00:00Z`));

type T = { id: string; title: string; day: string; is_priority: boolean; done: boolean; start_at: string | null; end_at: string | null };

export default async function Review({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const access = await getAccess(user.id, user.email);
  if (access.status === "expired") redirect("/activate");

  const offset = Math.max(-52, Math.min(0, Number((await searchParams).w ?? 0) || 0));
  const today = todayBangkok();
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -weekday + offset * 7);
  const sunday = addDays(monday, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const [{ data: taskData }, { data: review }, { data: prev }] = await Promise.all([
    supabase
      .from("planner_tasks")
      .select("id, title, day, is_priority, done, start_at, end_at")
      .gte("day", monday)
      .lte("day", sunday)
      .order("day"),
    supabase.from("planner_reviews").select("wins, improve, focus").eq("week_start", monday).maybeSingle(),
    supabase.from("planner_reviews").select("focus").eq("week_start", addDays(monday, -7)).maybeSingle(),
  ]);
  const tasks = (taskData ?? []) as T[];
  const done = tasks.filter((t) => t.done);
  const open = tasks.filter((t) => !t.done);
  const pri = tasks.filter((t) => t.is_priority);
  const rate = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const focusMinutes = done
    .filter((t) => t.start_at && t.end_at)
    .reduce((m, t) => m + (Date.parse(t.end_at!) - Date.parse(t.start_at!)) / 60e3, 0);
  const perDay = days.map((d) => ({
    d,
    total: tasks.filter((t) => t.day === d).length,
    done: tasks.filter((t) => t.day === d && t.done).length,
  }));
  const maxDay = Math.max(1, ...perDay.map((x) => x.total));

  const range = `${fmt(monday, { day: "numeric", month: "short" })} – ${fmt(sunday, { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <main className="mx-auto max-w-5xl px-5 py-6 md:py-10">
      <AppNav active="review" />

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">ทบทวน{offset === 0 ? "สัปดาห์นี้" : `ย้อนหลัง ${-offset} สัปดาห์`}</p>
          <h1 className="text-2xl font-bold">{range}</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/app/review?w=${offset - 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
            ‹ ก่อนหน้า
          </Link>
          {offset < 0 && (
            <Link href={`/app/review?w=${offset + 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-stone-300">
              ถัดไป ›
            </Link>
          )}
        </div>
      </header>

      {prev?.focus && (
        <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          🎯 โฟกัสที่ตั้งไว้สำหรับสัปดาห์นี้: <b>{prev.focus}</b>
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="งานเสร็จ" value={`${done.length}/${tasks.length}`} />
        <Stat label="อัตราสำเร็จ" value={`${rate}%`} />
        <Stat label="งานสำคัญที่เสร็จ" value={`${pri.filter((t) => t.done).length}/${pri.length}`} />
        <Stat label="เวลาโฟกัส (ที่ลงเวลา)" value={`${(focusMinutes / 60).toFixed(1)} ชม.`} />
      </div>

      <section className="mt-6 rounded-xl bg-white p-4 ring-1 ring-stone-200">
        <h2 className="text-sm font-semibold text-stone-500">รายวัน</h2>
        <div className="mt-3 flex h-36 items-end gap-2">
          {perDay.map((x) => (
            <div key={x.d} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs text-stone-500">{x.total ? `${x.done}/${x.total}` : ""}</span>
              <div className="relative w-full max-w-10 rounded-t bg-stone-100" style={{ height: `${(x.total / maxDay) * 96}px` }}>
                <div className="absolute bottom-0 w-full rounded-t bg-emerald-500" style={{ height: `${x.total ? (x.done / x.total) * 100 : 0}%` }} />
              </div>
              <span className={`text-xs ${x.d === today ? "font-bold text-emerald-700" : "text-stone-500"}`}>
                {fmt(x.d, { weekday: "short" })}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">✓ ทำสำเร็จ ({done.length})</h2>
          <ul className="mt-2 divide-y divide-stone-100 rounded-xl bg-white ring-1 ring-stone-200">
            {done.length === 0 && <li className="px-4 py-3 text-sm text-stone-400">ยังไม่มีงานที่เสร็จ</li>}
            {done.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-4 py-2 text-sm">
                <span>
                  {t.is_priority && "★ "}
                  {t.title}
                </span>
                <span className="shrink-0 text-stone-400">{fmt(t.day, { weekday: "short" })}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">ยังค้าง ({open.length})</h2>
          <ul className="mt-2 divide-y divide-stone-100 rounded-xl bg-white ring-1 ring-stone-200">
            {open.length === 0 && <li className="px-4 py-3 text-sm text-stone-400">ไม่มีงานค้าง 🎉</li>}
            {open.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-4 py-2 text-sm">
                <span>{t.title}</span>
                <span className="shrink-0 text-stone-400">{fmt(t.day, { weekday: "short" })}</span>
              </li>
            ))}
          </ul>
          {open.length > 0 && (
            <form action={moveOpenToNextWeek} className="mt-2">
              <input type="hidden" name="week_start" value={monday} />
              <button className="text-sm text-emerald-700 underline">ย้ายงานค้างทั้งหมดไปวันจันทร์หน้า →</button>
            </form>
          )}
        </section>
      </div>

      <form action={saveReview} className="mt-8 space-y-4 rounded-xl bg-white p-5 ring-1 ring-stone-200">
        <input type="hidden" name="week_start" value={monday} />
        <h2 className="font-semibold">📝 บันทึกการทบทวน</h2>
        <Field name="wins" label="อะไรที่ไปได้ดีสัปดาห์นี้?" value={review?.wins} />
        <Field name="improve" label="อะไรที่อยากปรับปรุง?" value={review?.improve} />
        <Field name="focus" label="🎯 โฟกัสหลักของสัปดาห์หน้า (1 เรื่อง)" value={review?.focus} rows={1} />
        <button className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-700">บันทึก</button>
      </form>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Field({ name, label, value, rows = 3 }: { name: string; label: string; value?: string | null; rows?: number }) {
  return (
    <label className="block text-sm">
      <span className="text-stone-600">{label}</span>
      <textarea
        name={name}
        rows={rows}
        maxLength={2000}
        defaultValue={value ?? ""}
        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
      />
    </label>
  );
}
