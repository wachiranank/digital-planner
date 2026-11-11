"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { QuickAddSheet } from "./quick-add-sheet";

// ---------- icons (stroke, currentColor) ----------
const I = {
  today: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 9.5h16M8 3v4M16 3v4M9 14.5l2 2 4-4" />
    </svg>
  ),
  upcoming: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 9.5h16M8 3v4M16 3v4M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" />
    </svg>
  ),
  month: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M3.5 9h17M9 9v11.5M15 9v11.5M3.5 14.5h17" />
    </svg>
  ),
  inbox: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <path d="M4 13l2.5-7.5h11L20 13v5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18z" />
      <path d="M4 13h4.5l1 2h5l1-2H20" />
    </svg>
  ),
  review: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M5 19V11M12 19V5M19 19v-6" />
    </svg>
  ),
  settings: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
    </svg>
  ),
  plus: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
};

type Item = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };

const isToday = (p: string) => p === "/app";

/** Navigation: an icon rail on laptops (lg+), a floating glass tab bar + "+" button on phones and tablets. */
export function AppShell({ inbox, children }: { inbox: number; children: React.ReactNode }) {
  const path = usePathname();
  const [adding, setAdding] = useState(false);

  // laptop: press "q" anywhere (outside a text field) to add a task
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "q" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      setAdding(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const badge = (n: number, cls = "") =>
    n > 0 ? (
      <span className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-stone-900 px-1 text-[11px] font-semibold leading-none text-white ${cls}`}>
        {n > 99 ? "99+" : n}
      </span>
    ) : null;

  const rail: Item[] = [
    { href: "/app", label: "วันนี้", icon: I.today, match: isToday },
    { href: "/app/week", label: "สัปดาห์", icon: I.upcoming, match: (p) => p.startsWith("/app/week") },
    { href: "/app/month", label: "เดือน", icon: I.month, match: (p) => p.startsWith("/app/month") },
    { href: "/app/inbox", label: "Inbox", icon: I.inbox, match: (p) => p.startsWith("/app/inbox") },
    { href: "/app/review", label: "ทบทวน", icon: I.review, match: (p) => p.startsWith("/app/review") },
  ];
  const tabs: Item[] = [
    { href: "/app", label: "วันนี้", icon: I.today, match: isToday },
    {
      href: "/app/week",
      label: "กำหนดการ",
      icon: I.upcoming,
      match: (p) => p.startsWith("/app/week") || p.startsWith("/app/month"),
    },
    { href: "/app/inbox", label: "Inbox", icon: I.inbox, match: (p) => p.startsWith("/app/inbox") },
    { href: "/app/review", label: "ทบทวน", icon: I.review, match: (p) => p.startsWith("/app/review") },
    {
      href: "/app/settings",
      label: "ตั้งค่า",
      icon: I.settings,
      match: (p) => p.startsWith("/app/settings") || p.startsWith("/app/admin"),
    },
  ];
  const showFab = !path.startsWith("/app/settings") && !path.startsWith("/app/admin");

  return (
    <>
      {/* laptop: icon rail */}
      <nav
        aria-label="เมนูหลัก"
        className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center gap-1 border-r border-stone-200 bg-stone-100/80 py-5 lg:flex"
      >
        <Link href="/app" className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white" aria-label="Planner">
          P
        </Link>
        <button
          onClick={() => setAdding(true)}
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-md shadow-brand-600/30 hover:bg-brand-700"
          aria-label="เพิ่มงาน (กด Q)"
          title="เพิ่มงาน (Q)"
        >
          {I.plus}
        </button>
        {rail.map((it) => {
          const on = it.match(path);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={`relative flex w-16 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${
                on ? "bg-brand-50 font-semibold text-brand-700" : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900"
              }`}
            >
              {it.icon}
              {it.label}
              {it.href === "/app/inbox" && badge(inbox, "absolute right-2 top-1")}
            </Link>
          );
        })}
        <Link
          href="/app/settings"
          aria-current={path.startsWith("/app/settings") ? "page" : undefined}
          className={`mt-auto flex w-16 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${
            path.startsWith("/app/settings") ? "bg-brand-50 font-semibold text-brand-700" : "text-stone-600 hover:bg-stone-200/60"
          }`}
        >
          {I.settings}
          ตั้งค่า
        </Link>
      </nav>

      <div className="pb-36 lg:pb-0 lg:pl-20">{children}</div>

      {/* phone/tablet: floating "+" and glass tab bar */}
      {showFab && (
        <button
          onClick={() => setAdding(true)}
          aria-label="เพิ่มงาน"
          className="fixed right-5 z-30 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-700/30 active:scale-95 lg:hidden"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 104px)" }}
        >
          {I.plus}
        </button>
      )}
      <nav
        aria-label="เมนูหลัก"
        className="glass fixed inset-x-3 z-30 grid h-[72px] grid-cols-5 items-center rounded-[36px] border border-white/90 px-1.5 shadow-[0_8px_30px_rgba(28,25,23,0.12)] sm:inset-x-auto sm:left-1/2 sm:w-[520px] sm:-translate-x-1/2 lg:hidden"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        {tabs.map((it) => {
          const on = it.match(path);
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={on ? "page" : undefined}
              className={`relative mx-0.5 flex h-[60px] flex-col items-center justify-center gap-0.5 rounded-[30px] text-[11px] ${
                on ? "bg-stone-200/70 font-semibold text-brand-700" : "text-stone-800"
              }`}
            >
              {it.icon}
              {it.label}
              {it.href === "/app/inbox" && badge(inbox, "absolute right-2 top-1")}
            </Link>
          );
        })}
      </nav>

      {adding && <QuickAddSheet inboxDefault={path.startsWith("/app/inbox")} onClose={() => setAdding(false)} />}
    </>
  );
}
