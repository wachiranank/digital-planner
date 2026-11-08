import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "./supabase/server";

let configured = false;
function setup() {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:support@example.com", pub, priv);
  configured = true;
  return true;
}

export type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Sends to every device of a user; removes subscriptions the browser has revoked. Returns devices reached. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!setup()) return 0;
  const admin = supabaseAdmin();
  const { data: subs } = await admin.from("planner_push_subs").select("endpoint, p256dh, auth").eq("user_id", userId);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 30, urgency: "high" },
      );
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("planner_push_subs").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent;
}
