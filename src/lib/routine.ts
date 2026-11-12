/** Each user's daily-routine schedule (morning plan, evening "ปิดวัน", weekly review). Times are minutes after midnight, Bangkok. */
export type RoutineSchedule = {
  morning_time: number;
  evening_time: number;
  routine_days: number; // bit 0 = Sunday … bit 6 = Saturday
  weekly_review: boolean;
  review_dow: number;
  review_time: number;
};

export const ROUTINE_DEFAULTS: RoutineSchedule = {
  morning_time: 7 * 60 + 30,
  evening_time: 20 * 60,
  routine_days: 0b1111111,
  weekly_review: true,
  review_dow: 0,
  review_time: 18 * 60,
};

export const DAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
export const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** Missing columns (before the migration runs) fall back to the old fixed times. */
export function withDefaults(p: Partial<RoutineSchedule> | null | undefined): RoutineSchedule {
  const v = { ...ROUTINE_DEFAULTS };
  for (const k of Object.keys(v) as (keyof RoutineSchedule)[]) {
    const x = p?.[k];
    if (x !== null && x !== undefined) (v as Record<string, unknown>)[k] = x;
  }
  return v;
}

export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** "07:30" → 450; anything invalid → null */
export function parseHHMM(s: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

export const onDay = (mask: number, dow: number) => ((mask >> dow) & 1) === 1;

/**
 * Is a once-a-day message due? The cron runs every 5 minutes; a message goes out on the first run at or after
 * its time, and is still sent within `windowMin` if a run was missed. Never spills into the next day.
 */
export const isDue = (nowMin: number, at: number, windowMin: number) => nowMin >= at && nowMin < Math.min(at + windowMin, 24 * 60);
