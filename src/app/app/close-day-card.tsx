"use client";

import { useState, useTransition } from "react";
import { moveLeftoversTomorrow, saveTodayNote } from "./actions";
import { MOODS } from "@/lib/moods";

/** Evening "close the day": what got done, move what's left, and a one-line reflection. */
export function CloseDayCard({
  done,
  total,
  left,
  mood,
  note,
}: {
  done: number;
  total: number;
  left: number;
  mood: number | null;
  note: string | null;
}) {
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<number | null>(mood);
  const [saved, setSaved] = useState(false);
  const allDone = total > 0 && done === total;

  return (
    <section
      id="close-day"
      className={`mt-5 scroll-mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-amber-50 p-4 shadow-sm ring-1 ring-brand-100 sm:p-5 ${
        pending ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">🌙 ปิดวัน</h2>
        <p className="text-sm text-stone-600">
          {total === 0 ? "วันนี้ไม่มีงานในแผน" : allDone ? `เสร็จครบ ${done}/${total} งาน เยี่ยมมาก 🎉` : `วันนี้เสร็จ ${done}/${total} งาน 👏`}
        </p>
      </div>

      {left > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm ring-1 ring-stone-200">
          <span className="text-stone-600">ยังเหลือ {left} งาน — ไม่เป็นไร พรุ่งนี้ค่อยต่อ</span>
          <button
            disabled={pending}
            onClick={() => start(() => moveLeftoversTomorrow())}
            className="rounded-full bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            ย้ายไปพรุ่งนี้ทั้งหมด
          </button>
        </div>
      )}

      <form
        action={(fd) =>
          start(async () => {
            await saveTodayNote(fd);
            setSaved(true);
          })
        }
        className="mt-3 space-y-2"
      >
        <p className="text-sm text-stone-600">วันนี้เป็นยังไงบ้าง?</p>
        <input type="hidden" name="mood" value={sel ?? ""} />
        <div className="flex gap-1.5" role="radiogroup" aria-label="อารมณ์วันนี้">
          {MOODS.map((m) => (
            <button
              key={m.v}
              type="button"
              role="radio"
              aria-checked={sel === m.v}
              title={m.label}
              aria-label={m.label}
              onClick={() => {
                setSel(sel === m.v ? null : m.v);
                setSaved(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition ${
                sel === m.v ? "scale-110 bg-white shadow ring-2 ring-brand-400" : "bg-white/60 opacity-60 hover:opacity-100"
              }`}
            >
              {m.e}
            </button>
          ))}
        </div>
        <textarea
          name="note"
          defaultValue={note ?? ""}
          onChange={() => setSaved(false)}
          rows={2}
          maxLength={2000}
          placeholder="เรื่องดีๆ วันนี้ / ได้เรียนรู้อะไร / พรุ่งนี้อยากโฟกัสอะไร"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <button disabled={pending} className="rounded-lg bg-stone-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-stone-900">
            บันทึก
          </button>
          {saved && <span className="text-sm text-brand-700">บันทึกแล้ว ✓ ดูย้อนหลังได้ในหน้า ทบทวน</span>}
        </div>
      </form>
    </section>
  );
}
