import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { getAccessToken } from "@/lib/google";
import { getTags } from "@/lib/tags-server";
import { addTask } from "../actions";
import { AppNav } from "../nav";
import { PlanRow } from "../plan-row";
import type { Task } from "../task-details";

export const dynamic = "force-dynamic";

/** Inbox: jot things down now, decide the day later. */
export default async function InboxPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const access = await getAccess(user.id, user.email);
  if (access.status === "expired") redirect("/activate");

  const [{ data }, tags, token] = await Promise.all([
    supabase
      .from("planner_tasks")
      .select("id, title, day, is_priority, done, start_at, end_at, gcal_event_id, notes, tag, checklist, recur_id")
      .is("day", null)
      .eq("done", false)
      .order("created_at", { ascending: false }),
    getTags(supabase),
    getAccessToken(user.id),
  ]);
  const tasks = (data ?? []) as Task[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 md:py-8">
      <AppNav active="inbox" />

      <header className="mt-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">📥 Inbox</h1>
        <p className="mt-1 text-sm text-stone-500">จดทุกอย่างที่อยู่ในหัวไว้ที่นี่ก่อน ยังไม่ต้องคิดว่าจะทำวันไหน แล้วค่อยมาเลือกวันทีหลัง</p>
      </header>

      <form
        action={addTask}
        className="mt-5 flex gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-200 focus-within:ring-2 focus-within:ring-emerald-500"
      >
        <input type="hidden" name="inbox" value="1" />
        <input
          name="title"
          required
          maxLength={500}
          autoFocus
          placeholder="จดไว้ก่อน… เช่น ต่อภาษีรถ, หาของขวัญวันเกิดแม่"
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 outline-none placeholder:text-stone-400"
        />
        <button className="rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700">จด</button>
      </form>
      <p className="mt-1.5 px-2 text-xs text-stone-400">
        ถ้าพิมพ์วันมาด้วย (เช่น &quot;พรุ่งนี้&quot;) งานจะไปอยู่วันนั้นเลย · ใน LINE พิมพ์ &quot;จด …&quot; ได้เหมือนกัน
      </p>

      <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold">รอเลือกวัน</h2>
          <span className="text-xs text-stone-500">{tasks.length} งาน</span>
        </div>
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {tasks.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-stone-400">
              Inbox ว่าง 🎉
              <br />
              นึกอะไรออกก็จดไว้ที่นี่ได้เลย จะได้ไม่ต้องจำ
            </li>
          )}
          {tasks.map((t) => (
            <PlanRow key={t.id} task={t} tags={tags} calendar={!!token} mode="inbox" />
          ))}
        </ul>
      </section>
    </main>
  );
}
