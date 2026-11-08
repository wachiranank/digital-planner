import Link from "next/link";
import { signOut } from "./actions";

export function AppNav({ active }: { active: "today" | "week" | "month" | "review" | "settings" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-white shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-800"}`}
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
        {tab("/app/review", "ทบทวน", active === "review")}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/app/settings"
          className={`text-lg ${active === "settings" ? "text-stone-800" : "text-stone-400 hover:text-stone-700"}`}
          aria-label="ตั้งค่าหมวดหมู่"
          title="ตั้งค่าหมวดหมู่"
        >
          ⚙️
        </Link>
        <form action={signOut}>
          <button className="text-sm text-stone-500 underline">ออก</button>
        </form>
      </div>
    </nav>
  );
}
