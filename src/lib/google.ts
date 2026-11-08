import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { appHost } from "./env";

export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TZ = "Asia/Bangkok";

export type GEvent = {
  id: string;
  summary?: string;
  status?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
};

export async function saveRefreshToken(userId: string, refreshToken: string) {
  await supabaseAdmin()
    .from("planner_google_tokens")
    .upsert({ user_id: userId, refresh_token: refreshToken, updated_at: new Date().toISOString() });
}

/** Short-lived access token from the stored refresh token; null if the user hasn't connected Calendar. */
export async function getAccessToken(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from("planner_google_tokens")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    // revoked or expired (Testing-mode tokens expire after ~7 days): ask the user to reconnect
    if (res.status === 400 || res.status === 401) {
      await supabaseAdmin().from("planner_google_tokens").delete().eq("user_id", userId);
    }
    return null;
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

async function gcal<T>(token: string, path: string, init: RequestInit = {}): Promise<T | null> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (res.status === 204 || res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

/** Events from the start of `fromDay` to the end of `toDay` (Bangkok, YYYY-MM-DD). */
export async function listRangeEvents(token: string, fromDay: string, toDay: string): Promise<GEvent[]> {
  const q = new URLSearchParams({
    timeMin: `${fromDay}T00:00:00+07:00`,
    timeMax: `${toDay}T23:59:59+07:00`,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const data = await gcal<{ items: GEvent[] }>(token, `?${q}`);
  return (data?.items ?? []).filter((e) => e.status !== "cancelled");
}

/** Events on one Bangkok day (YYYY-MM-DD). */
export const listDayEvents = (token: string, day: string) => listRangeEvents(token, day, day);

/** Bangkok calendar day (YYYY-MM-DD) an event starts on */
export const eventDay = (e: GEvent) =>
  e.start.date ?? new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(e.start.dateTime!));

export async function createEvent(token: string, summary: string, startISO: string, endISO: string) {
  return gcal<GEvent>(token, "", {
    method: "POST",
    body: JSON.stringify({
      summary,
      start: { dateTime: startISO, timeZone: TZ },
      end: { dateTime: endISO, timeZone: TZ },
      // link back to the planner from the event
      ...(appHost() && {
        source: { title: "Digital Planner", url: `https://${appHost()}/app` },
      }),
    }),
  });
}

export async function patchEvent(token: string, id: string, patch: Record<string, unknown>) {
  return gcal<GEvent>(token, `/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function deleteEvent(token: string, id: string) {
  await gcal(token, `/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** "09:30" in Bangkok for an ISO datetime */
export const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(
    new Date(iso),
  );
