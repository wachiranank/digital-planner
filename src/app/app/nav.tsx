import Link from "next/link";
import { signOut } from "./actions";

export function AppNav({ active }: { active: "today" | "week" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${on ? "bg-white shadow-sm ring-1 ring-stone-200" : "text-stone-500 hover:text-stone-800"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="flex items-center justify-between gap-4">
      <div className="flex gap-1 rounded-xl bg-stone-200/60 p-1">
        {tab("/app", "วันนี้", active === "today")}
        {tab("/app/week", "สัปดาห์", active === "week")}
      </div>
      <form action={signOut}>
        <button className="text-sm text-stone-500 underline">ออกจากระบบ</button>
      </form>
    </nav>
  );
}
