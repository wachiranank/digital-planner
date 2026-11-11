import Link from "next/link";

/** Phones/tablets: switch กำหนดการ between week and month (laptops have both in the rail). */
export function ViewSwitch({ active }: { active: "week" | "month" }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`rounded-lg px-4 py-1.5 text-sm ${on ? "bg-white font-semibold text-stone-900 shadow-sm" : "text-stone-500"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="mb-2 inline-flex rounded-xl bg-stone-200/60 p-1 lg:hidden">
      {tab("/app/week", "สัปดาห์", active === "week")}
      {tab("/app/month", "เดือน", active === "month")}
    </div>
  );
}
