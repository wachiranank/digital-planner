import "server-only";
import { randomBytes } from "crypto";
import { supabaseServer } from "./supabase/server";

/** Admins are listed in ADMIN_EMAILS (comma separated). Unset = no admin page at all. */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Signed-in admin's email, or null. Re-checked inside every admin action. */
export async function currentAdmin(): Promise<string | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && isAdmin(user.email) ? user.email! : null;
}

// Same format as the store: DPS-XXXX-XXXX-XXXX, no 0/O/1/I
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newLicenseKey(): string {
  const chars = Array.from(randomBytes(12), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `DPS-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}
