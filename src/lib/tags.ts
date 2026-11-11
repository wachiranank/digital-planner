// Category colours (literal class names so Tailwind keeps them)
export const COLORS = {
  sky: { chip: "bg-sky-100 text-sky-800", dot: "bg-sky-500", ring: "border-sky-500 bg-sky-50", name: "ฟ้า" },
  rose: { chip: "bg-rose-100 text-rose-800", dot: "bg-rose-500", ring: "border-rose-500 bg-rose-50", name: "ชมพู" },
  violet: { chip: "bg-violet-100 text-violet-800", dot: "bg-violet-500", ring: "border-violet-500 bg-violet-50", name: "ม่วง" },
  emerald: { chip: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500", ring: "border-emerald-600 bg-emerald-50", name: "เขียว" },
  amber: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500", ring: "border-amber-500 bg-amber-50", name: "เหลือง" },
  orange: { chip: "bg-orange-100 text-orange-800", dot: "bg-orange-500", ring: "border-orange-500 bg-orange-50", name: "ส้ม" },
  teal: { chip: "bg-teal-100 text-teal-800", dot: "bg-teal-500", ring: "border-teal-600 bg-teal-50", name: "เขียวอมฟ้า" },
  indigo: { chip: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500", ring: "border-indigo-500 bg-indigo-50", name: "น้ำเงิน" },
  red: { chip: "bg-red-100 text-red-800", dot: "bg-red-500", ring: "border-red-500 bg-red-50", name: "แดง" },
  slate: { chip: "bg-slate-200 text-slate-800", dot: "bg-slate-500", ring: "border-slate-500 bg-slate-100", name: "เทา" },
} as const;
export type ColorKey = keyof typeof COLORS;
export const isColor = (c: unknown): c is ColorKey => typeof c === "string" && c in COLORS;

/** A category: built-in (key = "work", …) or the user's own (key = uuid). */
export type TagDef = { key: string; label: string; color: ColorKey; custom: boolean };

export const BUILTIN: TagDef[] = [
  { key: "work", label: "งาน", color: "sky", custom: false },
  { key: "personal", label: "ส่วนตัว", color: "rose", custom: false },
  { key: "side", label: "งานเสริม", color: "violet", custom: false },
  { key: "health", label: "สุขภาพ", color: "emerald", custom: false },
  { key: "learn", label: "เรียนรู้", color: "amber", custom: false },
];
export const isBuiltinTag = (t: unknown) => typeof t === "string" && BUILTIN.some((b) => b.key === t);

export const findTag = (tags: TagDef[], key?: string | null) => (key ? (tags.find((t) => t.key === key) ?? null) : null);
export const tagStyle = (t: TagDef | null) => (t ? COLORS[t.color] : null);
/** Classes for the round "done" button of a task: tinted by its category, brick for a top-3 task without one. */
export const ringClass = (t: TagDef | null, priority = false) =>
  t ? COLORS[t.color].ring : priority ? "border-brand-600 bg-brand-50" : "border-stone-400 bg-white";

export const RULES = {
  daily: "ทุกวัน",
  weekdays: "ทุกวันทำงาน (จ.–ศ.)",
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
} as const;
export type Rule = keyof typeof RULES;
export const isRule = (r: unknown): r is Rule => typeof r === "string" && r in RULES;

export type CheckItem = { t: string; d: boolean };
