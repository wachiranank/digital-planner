import "server-only";
import { supabaseAdmin } from "./supabase/server";

export const TRIAL_DAYS = 14;

export type Access =
  | { status: "licensed" }
  | { status: "trial"; daysLeft: number }
  | { status: "expired" };

/** Calls the store's License API to bind a key to this planner account. */
export async function activateWithStore(userId: string, key: string): Promise<{ valid?: boolean; error?: string }> {
  const res = await fetch(`${process.env.STORE_URL}/api/license/activate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, device_id: `planner:${userId}` }), // one activation per planner account
    cache: "no-store",
  });
  return res.json();
}

/**
 * Buyers who sign in with the same email they paid with are licensed automatically
 * (no need to find the key in an email). Store and planner share one database.
 */
async function autoLicenseByEmail(userId: string, email: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("licenses")
    .select("key, order_items!inner(orders!inner(status, customers!inner(email)))")
    .eq("status", "active")
    .eq("order_items.orders.status", "paid")
    .eq("order_items.orders.customers.email", email.trim().toLowerCase())
    .limit(5);
  for (const { key } of data ?? []) {
    try {
      const r = await activateWithStore(userId, key);
      if (r.valid) {
        await admin
          .from("planner_profiles")
          .update({ license_key: key, licensed_at: new Date().toISOString() })
          .eq("user_id", userId);
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

/** Ensures a profile exists (starts the trial on first visit) and returns access state. */
export async function getAccess(userId: string, email?: string | null): Promise<Access> {
  const admin = supabaseAdmin();
  await admin.from("planner_profiles").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: p } = await admin
    .from("planner_profiles")
    .select("trial_started_at, license_key")
    .eq("user_id", userId)
    .single();
  if (p?.license_key) return { status: "licensed" };
  if (email && (await autoLicenseByEmail(userId, email))) return { status: "licensed" };
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
