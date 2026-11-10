import "server-only";
import webpush from "web-push";
import { supabaseAdmin } from "./supabase/server";
import { linePush } from "./line";
import { appHost } from "./env";

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

/** Web push to every device + LINE message if the user linked LINE. */
export async function notifyUser(
  userId: string,
  payload: PushPayload,
  opts: { line?: boolean; lineText?: string; quick?: string[] } = {},
) {
  const devices = await pushToUser(userId, payload);
  let line = false;
  if (opts.line !== false) {
    const { data: p } = await supabaseAdmin()
      .from("planner_profiles")
      .select("line_user_id, line_notify")
      .eq("user_id", userId)
      .maybeSingle();
    if (p?.line_user_id && p.line_notify) {
      const host = appHost();
      const link = host ? `\n\nhttps://${host}${payload.url ?? "/app"}` : "";
      // LINE can carry a longer, interactive text (with tap-to-reply buttons) than a push notification
      line = await linePush(p.line_user_id, `${payload.title}\n${opts.lineText ?? payload.body}${link}`, opts.quick);
    }
  }
  return { devices, line };
}
