"use client";

import { setRoutinePrefs } from "./notify-actions";

/** Settings: morning plan + evening "ปิดวัน" messages (web push and/or LINE). Saves on every change. */
export function RoutinePrefs({ dailyDigest, eveningReview }: { dailyDigest: boolean; eveningReview: boolean }) {
  const row = (name: string, label: string, hint: string, on: boolean) => (
    <label className="flex items-start justify-between gap-3 py-2">
      <span>
        <span className="block font-medium text-stone-800">{label}</span>
        <span className="block text-xs text-stone-500">{hint}</span>
      </span>
      <input
        type="checkbox"
        name={name}
        defaultChecked={on}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
      />
    </label>
  );
  return (
    <form action={setRoutinePrefs} className="divide-y divide-stone-100 rounded-xl bg-white px-4 py-1 text-sm ring-1 ring-stone-200">
      {row(
        "daily_digest",
        "☀️ วางแผนตอนเช้า (07:30)",
        'สรุปงานวันนี้ — ใน LINE มีเลขกำกับ ตอบ "สำคัญ 1 3 4" เพื่อเลือก 3 งานสำคัญได้ทันที',
        dailyDigest,
      )}
      {row(
        "evening_review",
        "🌙 ปิดวันตอนเย็น (20:00)",
        "สรุปว่าเสร็จกี่งาน ย้ายงานที่เหลือไปพรุ่งนี้ และบันทึกว่าวันนี้เป็นยังไง (ไม่ส่งในวันที่ไม่มีงาน)",
        eveningReview,
      )}
    </form>
  );
}
