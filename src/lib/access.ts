import "server-only";
import { supabaseAdmin } from "./supabase/server";

export const TRIAL_DAYS = 14;

export type Access =
  | { status: "licensed" }
  | { status: "trial"; daysLeft: number }
  | { status: "expired" };

/** Ensures a profile exists (starts the trial on first visit) and returns access state. */
export async function getAccess(userId: string): Promise<Access> {
  const admin = supabaseAdmin();
  await admin.from("planner_profiles").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: p } = await admin
    .from("planner_profiles")
    .select("trial_started_at, license_key")
    .eq("user_id", userId)
    .single();
  if (p?.license_key) return { status: "licensed" };
  const started = new Date(p?.trial_started_at ?? Date.now()).getTime();
  const daysLeft = Math.ceil(TRIAL_DAYS - (Date.now() - started) / 864e5);
  return daysLeft > 0 ? { status: "trial", daysLeft } : { status: "expired" };
}

/** Today's date (YYYY-MM-DD) in Bangkok time. */
export function todayBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

/** e.g. "วันอาทิตย์ที่ 8 พฤศจิกายน 2569" (Buddhist era) */
export function thaiLongDate(isoDay: string): string {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${isoDay}T12:00:00+07:00`));
}
