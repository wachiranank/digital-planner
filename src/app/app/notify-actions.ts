"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { pushToUser } from "@/lib/push";

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
    .update({ remind_minutes: minutes, daily_digest: form.get("daily_digest") === "on" })
    .eq("user_id", user.id);
  revalidatePath("/app", "layout");
}
