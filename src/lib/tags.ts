export const TAGS = {
  work: { label: "งาน", chip: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  personal: { label: "ส่วนตัว", chip: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
  side: { label: "งานเสริม", chip: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  health: { label: "สุขภาพ", chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  learn: { label: "เรียนรู้", chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
} as const;
export type Tag = keyof typeof TAGS;
export const isTag = (t: unknown): t is Tag => typeof t === "string" && t in TAGS;

export const RULES = {
  daily: "ทุกวัน",
  weekdays: "ทุกวันทำงาน (จ.–ศ.)",
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
} as const;
export type Rule = keyof typeof RULES;
export const isRule = (r: unknown): r is Rule => typeof r === "string" && r in RULES;

export type CheckItem = { t: string; d: boolean };
