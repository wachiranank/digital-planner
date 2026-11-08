import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess, thaiLongDate, todayBangkok } from "@/lib/access";
import { addTask, signOut } from "./actions";
import { TaskRow, type Task } from "./task-row";

export const dynamic = "force-dynamic";

export default async function PlannerToday() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const access = await getAccess(user.id);
  if (access.status === "expired") redirect("/activate");

  const today = todayBangkok();
  // Today's tasks + every unfinished task from earlier days (auto carry-over)
  const { data } = await supabase
    .from("planner_tasks")
    .select("id, title, day, is_priority, done")
    .or(`day.eq.${today},and(day.lt.${today},done.eq.false)`)
    .order("created_at");
  const tasks = (data ?? []) as Task[];

  const priorities = tasks.filter((t) => t.is_priority && !t.done);
  const carried = tasks.filter((t) => t.day < today && !t.is_priority);
  const others = tasks.filter((t) => t.day === today && !t.is_priority && !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 md:py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">วันนี้</p>
          <h1 className="text-2xl font-bold">{thaiLongDate(today)}</h1>
        </div>
        <form action={signOut}>
          <button className="text-sm text-stone-500 underline">ออกจากระบบ</button>
        </form>
      </header>

      {access.status === "trial" && (
        <Link href="/activate" className="mt-4 block rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          ทดลองใช้เหลือ {access.daysLeft} วัน — กดเพื่อใส่ license key
        </Link>
      )}

      <form action={addTask} className="mt-6 flex gap-2">
        <input
          name="title"
          required
          maxLength={500}
          placeholder="เพิ่มงานวันนี้..."
          className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3"
        />
        <button className="rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700">เพิ่ม</button>
      </form>

      <Section title={`งานสำคัญ (${priorities.length}/3)`} hint="กด ☆ ที่งานเพื่อเลือกเป็นงานสำคัญของวัน">
        {priorities.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </Section>

      {carried.length > 0 && (
        <Section title={`ยกมาจากวันก่อน (${carried.length})`}>
          {carried.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </Section>
      )}

      <Section title="งานอื่นวันนี้">
        {others.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </Section>

      {done.length > 0 && (
        <Section title={`เสร็จแล้ว (${done.length})`}>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </Section>
      )}
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
