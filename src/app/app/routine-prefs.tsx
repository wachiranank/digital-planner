"use client";

import { useState, useTransition } from "react";
import { setRoutinePrefs } from "./notify-actions";
import { DAY_LABELS, DAY_NAMES, hhmm, onDay, type RoutineSchedule } from "@/lib/routine";

type Props = RoutineSchedule & { dailyDigest: boolean; eveningReview: boolean };

/** Settings: morning plan, evening "ปิดวัน" and weekly review — on/off, time and days are the user's choice. Saves on every change. */
export function RoutinePrefs(p: Props) {
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [on, setOn] = useState({ morning: p.dailyDigest, evening: p.eveningReview, weekly: p.weekly_review });

  const save = (form: HTMLFormElement | null) => {
    if (!form) return;
    const data = new FormData(form);
    start(async () => {
      await setRoutinePrefs(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => save(e.currentTarget.form);

  const timeInput = (name: string, value: number, enabled: boolean, label: string) => (
    <input
      type="time"
      name={name}
      step={300}
      defaultValue={hhmm(value)}
      onChange={change}
      disabled={!enabled}
      aria-label={label}
      className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm tabular-nums text-stone-800 disabled:opacity-40"
    />
  );
  const toggle = (name: string, key: keyof typeof on) => (
    <input
      type="checkbox"
      name={name}
      checked={on[key]}
      onChange={(e) => {
        setOn((o) => ({ ...o, [key]: e.target.checked }));
        save(e.currentTarget.form);
      }}
      className="h-5 w-5 shrink-0 accent-brand-600"
    />
  );
  const row = (title: string, hint: string, control: React.ReactNode, time: React.ReactNode) => (
    <div className="flex items-start gap-3 py-3">
      <div className="pt-0.5">{control}</div>
      <div className="min-w-0 flex-1">
        <span className="block font-medium text-stone-800">{title}</span>
        <span className="block text-xs text-stone-500">{hint}</span>
      </div>
      <div className="shrink-0">{time}</div>
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(e.currentTarget);
      }}
      className="divide-y divide-stone-100 rounded-xl bg-white px-4 text-sm ring-1 ring-stone-200"
    >
      {row(
        "☀️ วางแผนตอนเช้า",
        'สรุปงานวันนี้ — ใน LINE มีเลขกำกับ ตอบ "สำคัญ 1 3 4" เพื่อเลือก 3 งานสำคัญได้ทันที',
        toggle("daily_digest", "morning"),
        timeInput("morning_time", p.morning_time, on.morning, "เวลาวางแผนตอนเช้า"),
      )}
      {row(
        "🌙 ปิดวันตอนเย็น",
        "สรุปว่าเสร็จกี่งาน ย้ายงานที่เหลือไปพรุ่งนี้ และบันทึกว่าวันนี้เป็นยังไง (ไม่ส่งในวันที่ไม่มีงาน) — การ์ดปิดวันในแอปขึ้นก่อนเวลานี้ 3 ชม.",
        toggle("evening_review", "evening"),
        timeInput("evening_time", p.evening_time, on.evening, "เวลาปิดวัน"),
      )}

      <div className="py-3">
        <span className="block font-medium text-stone-800">📅 วันที่ส่งเช้า–เย็น</span>
        <span className="block text-xs text-stone-500">เช่น ปิดเสาร์–อาทิตย์ถ้าไม่อยากวางแผนวันหยุด</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DAY_LABELS.map((d, i) => (
            <label key={i} title={DAY_NAMES[i]} className="cursor-pointer">
              <input
                type="checkbox"
                name={`day_${i}`}
                defaultChecked={onDay(p.routine_days, i)}
                onChange={(e) => {
                  const form = e.currentTarget.form;
                  // keep at least one day
                  if (form && !DAY_LABELS.some((_, j) => (form.elements.namedItem(`day_${j}`) as HTMLInputElement)?.checked)) {
                    e.currentTarget.checked = true;
                    return;
                  }
                  save(form);
                }}
                className="peer sr-only"
              />
              <span className="inline-flex h-9 w-10 items-center justify-center rounded-full text-sm ring-1 ring-stone-200 transition peer-checked:bg-brand-600 peer-checked:text-white peer-checked:ring-brand-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-brand-600">
                {d}
              </span>
            </label>
          ))}
        </div>
      </div>

      {row(
        "📝 ชวนทบทวนสัปดาห์",
        "เตือนให้ใช้ 5 นาทีดูว่าสัปดาห์นี้ทำอะไรสำเร็จ และตั้งโฟกัสสัปดาห์หน้า",
        toggle("weekly_review", "weekly"),
        <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
          <select
            name="review_dow"
            defaultValue={p.review_dow}
            onChange={change}
            disabled={!on.weekly}
            aria-label="วันทบทวนสัปดาห์"
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm text-stone-800 disabled:opacity-40"
          >
            {DAY_NAMES.map((d, i) => (
              <option key={i} value={i}>
                วัน{d}
              </option>
            ))}
          </select>
          {timeInput("review_time", p.review_time, on.weekly, "เวลาทบทวนสัปดาห์")}
        </div>,
      )}

      <p className="py-2 text-right text-xs text-stone-400" aria-live="polite">
        {pending ? "กำลังบันทึก…" : saved ? "บันทึกแล้ว ✓" : "บันทึกอัตโนมัติ · เวลาไทย"}
      </p>
    </form>
  );
}
