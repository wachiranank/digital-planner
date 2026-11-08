import Link from "next/link";

export function AppNav({ active }: { active: "today" | "week" | "month" | "review" | "settings" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
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
