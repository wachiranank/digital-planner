import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { notifyUser } from "@/lib/push";
import { TRIAL_DAYS, todayBangkok } from "@/lib/access";
import { dayStats, eveningText, morningText, openForToday } from "@/lib/day";
import { MOODS } from "@/lib/moods";
import { isDue, onDay, withDefaults } from "@/lib/routine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called every 5 minutes by Supabase pg_cron (see README). Sends:
//  1) "starting soon" reminders for time-blocked tasks
//  2) a morning digest
//  3) a weekly-review nudge
//  4) an evening "close the day" summary (LINE gets mood buttons)
// 2–4 follow each user's own schedule (⚙️ ตัวช่วยวางแผนรายวัน); defaults 07:30 / 20:00 / Sunday 18:00.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const now = Date.now();
  const today = todayBangkok();
  const bkk = new Date(now + 7 * 3600e3); // Bangkok wall clock in UTC fields
  const minutesOfDay = bkk.getUTCHours() * 60 + bkk.getUTCMinutes();
  const dow = bkk.getUTCDay();

  // Only users with at least one device, and with a valid license or trial
  // Users reachable by web push or LINE
  const [{ data: subs }, { data: lineUsers }] = await Promise.all([
    admin.from("planner_push_subs").select("user_id"),
    admin.from("planner_profiles").select("user_id").not("line_user_id", "is", null).eq("line_notify", true),
  ]);
  const userIds = [...new Set([...(subs ?? []), ...(lineUsers ?? [])].map((s) => s.user_id as string))];
  if (userIds.length === 0) return NextResponse.json({ ok: true, users: 0 });

  const { data: profiles } = await admin
    .from("planner_profiles")
    .select("user_id, trial_started_at, license_key, remind_minutes, daily_digest, last_digest_day, last_review_nudge, evening_review, last_evening_day, morning_time, evening_time, routine_days, weekly_review, review_dow, review_time")
    .in("user_id", userIds);
  const active = (profiles ?? []).filter(
    (p) => p.license_key || now - Date.parse(p.trial_started_at) < TRIAL_DAYS * 864e5,
  );
  const byUser = new Map(active.map((p) => [p.user_id as string, p]));
  const stats = { reminders: 0, digests: 0, nudges: 0, evenings: 0 };

  // 1) task reminders: start within each user's lead time (max 60 min), not yet reminded
  const { data: due } = await admin
    .from("planner_tasks")
    .select("id, user_id, title, start_at")
    .eq("done", false)
    .is("reminded_at", null)
    .gte("start_at", new Date(now - 10 * 60e3).toISOString())
    .lte("start_at", new Date(now + 60 * 60e3).toISOString())
    .in("user_id", [...byUser.keys()]);
  for (const t of due ?? []) {
    const p = byUser.get(t.user_id);
    if (!p) continue;
    const mins = Math.round((Date.parse(t.start_at) - now) / 60e3);
    if (mins > (p.remind_minutes ?? 10)) continue;
    const at = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(
      new Date(t.start_at),
    );
    // Watch-friendly: the task itself is in the title (a watch "short look" shows only the title)
    const name = t.title.length > 40 ? `${t.title.slice(0, 39)}…` : t.title;
    await notifyUser(t.user_id, {
      title: `⏰ ${at} ${name}`,
      body: mins > 0 ? `อีก ${mins} นาที` : "ถึงเวลาแล้ว",
      url: "/app",
      tag: `task-${t.id}`,
    });
    await admin.from("planner_tasks").update({ reminded_at: new Date().toISOString() }).eq("id", t.id);
    stats.reminders++;
  }

  // 2) morning digest at the user's time (sent up to 3½ h late if a run was missed), once per day
  {
    for (const p of active) {
      const r = withDefaults(p);
      if (!p.daily_digest || p.last_digest_day === today) continue;
      if (!onDay(r.routine_days, dow) || !isDue(minutesOfDay, r.morning_time, 210)) continue;
      const list = await openForToday(p.user_id, today);
      const top = list.filter((t) => t.is_priority).map((t) => t.title);
      const carried = list.filter((t) => t.day < today).length;
      const body =
        list.length === 0
          ? "ยังไม่มีงานวันนี้ — เปิดแอปเพื่อวางแผนวันของคุณ"
          : [
              `วันนี้มี ${list.length} งาน${carried ? ` (ยกมา ${carried})` : ""}`,
              top.length ? `สำคัญ: ${top.slice(0, 3).join(" · ")}` : "ยังไม่ได้เลือกงานสำคัญ 3 อย่าง",
            ].join("\n");
      // LINE gets the numbered list so the user can answer "สำคัญ 1 3 4" right in the chat
      await notifyUser(p.user_id, { title: "☀️ สวัสดีตอนเช้า", body, url: "/app", tag: "digest" }, { lineText: morningText(list, today) });
      await admin.from("planner_profiles").update({ last_digest_day: today }).eq("user_id", p.user_id);
      stats.digests++;
    }
  }

  // 3) weekly review nudge on the user's day and time (window 4 h)
  {
    for (const p of active) {
      const r = withDefaults(p);
      if (!r.weekly_review || p.last_review_nudge === today) continue;
      if (dow !== r.review_dow || !isDue(minutesOfDay, r.review_time, 240)) continue;
      await notifyUser(p.user_id, {
        title: "📝 ทบทวนสัปดาห์",
        body: "ใช้ 5 นาทีดูว่าสัปดาห์นี้ทำอะไรสำเร็จ และตั้งโฟกัสสัปดาห์หน้า",
        url: "/app/review",
        tag: "review",
      });
      await admin.from("planner_profiles").update({ last_review_nudge: today }).eq("user_id", p.user_id);
      stats.nudges++;
    }
  }

  // 4) close the day at the user's time (window 2 h) — what got done, what's left, how the day felt. Skipped on an empty day.
  {
    for (const p of active) {
      const r = withDefaults(p);
      if (!p.evening_review || p.last_evening_day === today) continue;
      if (!onDay(r.routine_days, dow) || !isDue(minutesOfDay, r.evening_time, 120)) continue;
      await admin.from("planner_profiles").update({ last_evening_day: today }).eq("user_id", p.user_id);
      const s = await dayStats(p.user_id, today);
      if (s.total === 0 && s.open.length === 0) continue;
      const left = s.open.filter((t) => !t.recur_id).length;
      await notifyUser(
        p.user_id,
        {
          title: "🌙 ปิดวัน",
          body: `เสร็จ ${s.done}/${s.total} งาน${left ? ` · เหลือ ${left} งาน` : " 🎉"} — แตะเพื่อสรุปวันนี้`,
          url: "/app#close-day",
          tag: "evening",
        },
        {
          lineText: eveningText(s, today),
          quick: [...(left ? ["ย้ายพรุ่งนี้"] : []), ...MOODS.map((m) => `วันนี้ ${m.e}`)],
        },
      );
      stats.evenings++;
    }
  }

  return NextResponse.json({ ok: true, users: active.length, ...stats });
}
