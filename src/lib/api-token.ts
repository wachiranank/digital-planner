import "server-only";
// Personal API tokens (Siri Shortcuts / Apple Watch). The token is shown once; only its SHA-256 is stored.
import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "./supabase/server";
import { getAccess } from "./access";

export const MAX_TOKENS = 5;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** New random token, e.g. "dpt_3kq…" (43 chars of base64url after the prefix). */
export function newToken() {
  const token = `dpt_${randomBytes(32).toString("base64url")}`;
  return { token, hash: hash(token), prefix: token.slice(0, 8) };
}

export type TokenAuth = { ok: true; userId: string } | { ok: false; status: number; message: string };

/** Reads "Authorization: Bearer dpt_…" and checks the token and the owner's license/trial. */
export async function authToken(header: string | null): Promise<TokenAuth> {
  const token = header?.match(/^Bearer\s+(dpt_[A-Za-z0-9_-]{20,})\s*$/i)?.[1];
  if (!token) return { ok: false, status: 401, message: "ไม่พบ token — ใส่ header Authorization: Bearer <token>" };
  const admin = supabaseAdmin();
  const { data } = await admin.from("planner_api_tokens").select("id, user_id").eq("token_hash", hash(token)).maybeSingle();
  if (!data) return { ok: false, status: 401, message: "token ไม่ถูกต้องหรือถูกยกเลิกแล้ว — สร้างใหม่ได้ที่ ⚙️ ตั้งค่า" };
  const access = await getAccess(data.user_id);
  if (access.status === "expired") return { ok: false, status: 402, message: "หมดช่วงทดลองใช้ — ใส่ license ในแอปเพื่อใช้งานต่อ" };
  await admin.from("planner_api_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { ok: true, userId: data.user_id };
}

/** Plain-text reply (Shortcuts "Show Result" displays it; Siri reads it out). */
export const textReply = (text: string, status = 200) =>
  new Response(text, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
