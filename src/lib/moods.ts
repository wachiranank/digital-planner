// Mood scale for the daily "close the day" note. Shared by the app and the LINE bot.
export const MOODS = [
  { v: 5, e: "😄", label: "ดีมาก" },
  { v: 4, e: "🙂", label: "ดี" },
  { v: 3, e: "😐", label: "เฉยๆ" },
  { v: 2, e: "😕", label: "ไม่ค่อยดี" },
  { v: 1, e: "😫", label: "เหนื่อย" },
] as const;

export const moodEmoji = (v: number | null | undefined) => MOODS.find((m) => m.v === v)?.e ?? "";
export const moodFromEmoji = (s: string) => MOODS.find((m) => s.includes(m.e))?.v ?? null;
