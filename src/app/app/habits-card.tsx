"use client";

import { useState, useTransition } from "react";
import { addHabit, archiveHabit, toggleHabit } from "./actions";

export type HabitData = { id: string; name: string; emoji: string | null; days: string[] /* logged days, YYYY-MM-DD */ };

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const dow = (day: string) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));

function streak(days: Set<string>, today: string) {
  // counts back from today (or yesterday, so an unticked "today" doesn't break the streak yet)
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function HabitsCard({ habits, today }: { habits: HabitData[]; today: string }) {
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState(false);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <section className={`rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-stone-200 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">✅ นิสัยประจำวัน</h2>
        {habits.length > 0 && (
          <button onClick={() => setEdit((e) => !e)} className="text-xs text-stone-500 underline">
            {edit ? "เสร็จ" : "แก้ไข"}
          </button>
        )}
      </div>

      <ul className="mt-2 space-y-2">
        {habits.map((h) => {
          const set = new Set(h.days);
          const doneToday = set.has(today);
          const s = streak(set, today);
          return (
            <li key={h.id} className="flex items-center gap-2">
              <button
                onClick={() => start(() => toggleHabit(h.id, today, !doneToday))}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ring-1 ${
                  doneToday ? "bg-emerald-600 text-white ring-emerald-600" : "bg-white ring-stone-300"
                }`}
                aria-pressed={doneToday}
                aria-label={`${h.name} วันนี้`}
              >
                {doneToday ? "✓" : (h.emoji ?? "")}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate">{h.emoji && doneToday ? `${h.emoji} ` : ""}{h.name}</p>
                <div className="mt-0.5 flex gap-1" aria-hidden>
                  {last7.map((d) => (
                    <button
                      key={d}
                      onClick={() => start(() => toggleHabit(h.id, d, !set.has(d)))}
                      title={d}
                      className={`h-4 w-4 rounded-sm text-[9px] leading-4 ${set.has(d) ? "bg-emerald-500 text-white" : "bg-stone-100 text-stone-400"}`}
                    >
                      {dow(d)}
                    </button>
                  ))}
                </div>
              </div>
              {s > 0 && <span className="shrink-0 text-xs font-semibold text-orange-600">🔥{s}</span>}
              {edit && (
                <button onClick={() => start(() => archiveHabit(h.id))} className="text-stone-300 hover:text-red-500" aria-label="ลบนิสัย">
                  ✕
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {(edit || habits.length === 0) && (
        <form action={(fd) => start(() => addHabit(fd))} className="mt-3 flex gap-2">
          <input name="emoji" maxLength={4} placeholder="💧" className="w-12 rounded-md border border-stone-300 px-2 py-1.5 text-center" />
          <input
            name="name"
            required
            maxLength={80}
            placeholder={habits.length ? "เพิ่มนิสัยใหม่" : "เช่น ดื่มน้ำ 8 แก้ว, ออกกำลังกาย"}
            className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1.5"
          />
          <button className="rounded-md bg-emerald-600 px-3 font-medium text-white">เพิ่ม</button>
        </form>
      )}
    </section>
  );
}
