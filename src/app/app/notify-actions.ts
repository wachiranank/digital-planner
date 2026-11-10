"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { pushToUser } from "@/lib/push";
import { linePush } from "@/lib/line";

async function me() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return user;
}

type Sub = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

export async function savePushSub(sub: Sub) {
  const user = await me();
  const endpoint = sub.endpoint;
  const { p256dh, auth } = sub.keys ?? {};
  if (!endpoint?.startsWith("https://") || !p256dh || !auth) return { ok: false };
  await supabaseAdmin()
    .from("planner_push_subs")
    .upsert({ endpoint, user_id: user.id, p256dh, auth }, { onConflict: "endpoint" });
  return { ok: true };
}

export async function removePushSub(endpoint: string) {
  const user = await me();
  await supabaseAdmin().from("planner_push_subs").delete().eq("endpoint", endpoint).eq("user_id", user.id);
  return { ok: true };
}

export async function sendTestPush() {
  const user = await me();
  const sent = await pushToUser(user.id, {
    title: "🔔 ทดสอบการแจ้งเตือน",
    body: "เรียบร้อย! คุณจะได้รับแจ้งเตือนก่อนเริ่มงานที่ลงเวลาไว้",
    url: "/app",
    tag: "test",
  });
  return { sent };
}

export async function setReminderPrefs(form: FormData) {
  const user = await me();
  const minutes = [0, 5, 10, 15, 30, 60].includes(Number(form.get("remind_minutes"))) ? Number(form.get("remind_minutes")) : 10;
  await supabaseAdmin()
    .from("planner_profiles")
    .update({ remind_minutes: minutes })
    .eq("user_id", user.id);
  revalidatePath("/app", "layout");
}

/** Morning plan (07:30) and evening "ปิดวัน" (20:00) messages — sent by web push and/or LINE. */
export async function setRoutinePrefs(form: FormData) {
  const user = await me();
  await supabaseAdmin()
    .from("planner_profiles")
    .update({ daily_digest: form.get("daily_digest") === "on", evening_review: form.get("evening_review") === "on" })
    .eq("user_id", user.id);
  revalidatePath("/app", "layout");
}

// ---- LINE ----
export async function createLineLinkCode() {
  const user = await me();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  const expires = new Date(Date.now() + 15 * 60e3).toISOString();
  const { error } = await supabaseAdmin()
    .from("planner_profiles")
    .update({ line_link_code: code, line_link_expires: expires })
    .eq("user_id", user.id);
  return error ? { code: null } : { code };
}

export async function unlinkLine() {
  const user = await me();
  await supabaseAdmin().from("planner_profiles").update({ line_user_id: null }).eq("user_id", user.id);
  revalidatePath("/app", "layout");
}

export async function setLineNotify(on: boolean) {
  const user = await me();
  await supabaseAdmin().from("planner_profiles").update({ line_notify: on }).eq("user_id", user.id);
  revalidatePath("/app", "layout");
}

export async function sendTestLine() {
  const user = await me();
  const { data: p } = await supabaseAdmin().from("planner_profiles").select("line_user_id").eq("user_id", user.id).maybeSingle();
  if (!p?.line_user_id) return { ok: false };
  return { ok: await linePush(p.line_user_id, "🔔 ทดสอบการแจ้งเตือนทาง LINE — เรียบร้อย!") };
}
