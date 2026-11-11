import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export async function AppNav({ active }: { active: "today" | "inbox" | "week" | "month" | "review" | "settings" }) {
  // how many tasks are waiting in the Inbox (RLS limits this to the signed-in user)
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("planner_tasks")
    .select("id", { count: "exact", head: true })
    .is("day", null)
    .eq("done", false);
  const inbox = count ?? 0;

  const tab = (href: string, label: React.ReactNode, on: boolean) => (
    <Link
      href={href}
      className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        on ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-800"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex items-center justify-between gap-3">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-stone-200/60 p-1">
        {tab("/app", "วันนี้", active === "today")}
        {tab("/app/week", "สัปดาห์", active === "week")}
        {tab("/app/month", "เดือน", active === "month")}
        {tab(
          "/app/inbox",
          <>
            Inbox
            {inbox > 0 && (
              <span className="rounded-full bg-stone-500/15 px-1.5 text-[11px] font-semibold leading-4 text-stone-600">{inbox}</span>
            )}
          </>,
          active === "inbox",
        )}
        {tab("/app/review", "ทบทวน", active === "review")}
      </div>
      <Link
        href="/app/settings"
        className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
          active === "settings" ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-800"
        }`}
        aria-label="ตั้งค่า"
      >
        <span aria-hidden>⚙️</span>
        <span className="hidden sm:inline">ตั้งค่า</span>
      </Link>
    </nav>
  );
}
