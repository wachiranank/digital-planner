"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { addTask } from "./actions";
import { parseQuick } from "@/lib/thai-parse";

const todayBkk = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const plus = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const dayLabel = (d: string, today: string) =>
  d === today
    ? "วันนี้"
    : d === plus(today, 1)
      ? "พรุ่งนี้"
      : new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
const addMin = (hm: string, m: number) => {
  const t = Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3)) + m;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * Add a task from anywhere: a bottom sheet on phones, a centered dialog on laptops.
 * Shows live what the Thai quick-add parser understood (day / time / duration).
 */
export function QuickAddSheet({ inboxDefault, onClose }: { inboxDefault: boolean; onClose: () => void }) {
  const [text, setText] = useState("");
  const [inbox, setInbox] = useState(inboxDefault);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const today = todayBkk();
  const p = useMemo(() => (text.trim() ? parseQuick(text, today) : null), [text, today]);
  const day = p?.day ?? (inbox ? null : today);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/30 lg:items-start lg:pt-[15vh]" onClick={onClose}>
      <form
        role="dialog"
        aria-label="เพิ่มงานใหม่"
        onClick={(e) => e.stopPropagation()}
        action={(fd) =>
          start(async () => {
            await addTask(fd);
            onClose();
          })
        }
        className="w-full max-w-xl rounded-t-[28px] bg-white px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-2.5 shadow-[0_-10px_40px_rgba(28,25,23,0.18)] lg:rounded-2xl lg:pb-5 lg:pt-5 lg:shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-200 lg:hidden" />
        {inbox && <input type="hidden" name="inbox" value="1" />}
        <label className="block">
          <span className="text-xs text-stone-500">พิมพ์งาน วัน และเวลาได้เลย</span>
          <input
            ref={ref}
            name="title"
            required
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="เช่น ประชุมลูกค้า พรุ่งนี้ บ่าย 2 1 ชม."
            className="mt-1 w-full bg-transparent text-xl outline-none placeholder:text-stone-300"
            autoComplete="off"
            enterKeyHint="send"
          />
        </label>

        {/* what the parser understood */}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span
            className={`flex h-9 items-center gap-1.5 rounded-xl px-3 ring-1 ${
              day ? "bg-brand-50 text-brand-700 ring-brand-100" : "bg-stone-50 text-stone-600 ring-stone-200"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
              <path d="M3.5 10h17" />
            </svg>
            {day ? dayLabel(day, today) : "Inbox (ยังไม่เลือกวัน)"}
            {day && p?.time && ` ${p.time}–${addMin(p.time, p.minutes ?? 60)}`}
          </span>
          {p && p.title !== text.trim() && (
            <span className="flex h-9 max-w-full items-center truncate rounded-xl bg-stone-50 px-3 text-stone-600 ring-1 ring-stone-200">
              ชื่องาน: {p.title}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
          <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl px-2 text-sm text-stone-600 hover:bg-stone-50">
            <input type="checkbox" checked={inbox} onChange={(e) => setInbox(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            ถ้าไม่ระบุวัน ให้ลง Inbox
          </label>
          <button
            disabled={pending || !text.trim()}
            className="flex h-12 items-center gap-2 rounded-full bg-brand-600 px-5 font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {pending ? "กำลังเพิ่ม…" : "เพิ่มงาน"}
          </button>
        </div>
        <p className="mt-2 hidden text-xs text-stone-400 lg:block">Enter เพื่อเพิ่ม · Esc เพื่อปิด · กด Q ที่ไหนก็ได้เพื่อเปิดหน้านี้</p>
      </form>
    </div>
  );
}
