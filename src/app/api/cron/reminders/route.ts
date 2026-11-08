import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pushToUser } from "@/lib/push";
import { TRIAL_DAYS, todayBangkok } from "@/lib/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Called every 5 minutes by Supabase pg_cron (see README). Sends:
//  1) "starting soon" reminders for time-blocked tasks
//  2) a morning digest (from 07:30 Bangkok)
//  3) a Sunday-evening nudge to do the weekly review (from 18:00)
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
  const isSunday = bkk.getUTCDay() === 0;

  // Only users with at least one device, and with a valid license or trial
  const { data: subs } = await admin.from("planner_push_subs").select("user_id");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  if (userIds.length === 0) return NextResponse.json({ ok: true, users: 0 });

  const { data: profiles } = await admin
    .from("planner_profiles")
    .select("user_id, trial_started_at, license_key, remind_minutes, daily_digest, last_digest_day, last_review_nudge")
    .in("user_id", userIds);
  const active = (profiles ?? []).filter(
    (p) => p.license_key || now - Date.parse(p.trial_started_at) < TRIAL_DAYS * 864e5,
  );
  const byUser = new Map(active.map((p) => [p.user_id as string, p]));
  const stats = { reminders: 0, digests: 0, nudges: 0 };

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
    await pushToUser(t.user_id, {
      title: mins > 0 ? `⏰ อีก ${mins} นาที · ${at} น.` : `⏰ ถึงเวลาแล้ว · ${at} น.`,
      body: t.title,
      url: "/app",
      tag: `task-${t.id}`,
    });
    await admin.from("planner_tasks").update({ reminded_at: new Date().toISOString() }).eq("id", t.id);
    stats.reminders++;
  }

  // 2) morning digest, 07:30–11:00 Bangkok, once per day
  if (minutesOfDay >= 7 * 60 + 30 && minutesOfDay < 11 * 60) {
    for (const p of active) {
      if (!p.daily_digest || p.last_digest_day === today) continue;
      const { data: tasks } = await admin
        .from("planner_tasks")
        .select("title, is_priority, day")
        .eq("user_id", p.user_id)
        .eq("done", false)
        .lte("day", today);
      const list = tasks ?? [];
      const top = list.filter((t) => t.is_priority).map((t) => t.title);
      const carried = list.filter((t) => t.day < today).length;
      const body =
        list.length === 0
          ? "ยังไม่มีงานวันนี้ — เปิดแอปเพื่อวางแผนวันของคุณ"
          : [
              `วันนี้มี ${list.length} งาน${carried ? ` (ยกมา ${carried})` : ""}`,
              top.length ? `สำคัญ: ${top.slice(0, 3).join(" · ")}` : "ยังไม่ได้เลือกงานสำคัญ 3 อย่าง",
            ].join("\n");
      await pushToUser(p.user_id, { title: "☀️ สวัสดีตอนเช้า", body, url: "/app", tag: "digest" });
      await admin.from("planner_profiles").update({ last_digest_day: today }).eq("user_id", p.user_id);
      stats.digests++;
    }
  }

  // 3) Sunday 18:00–22:00: weekly review nudge
  if (isSunday && minutesOfDay >= 18 * 60 && minutesOfDay < 22 * 60) {
    for (const p of active) {
      if (p.last_review_nudge === today) continue;
      await pushToUser(p.user_id, {
        title: "📝 ทบทวนสัปดาห์",
        body: "ใช้ 5 นาทีดูว่าสัปดาห์นี้ทำอะไรสำเร็จ และตั้งโฟกัสสัปดาห์หน้า",
        url: "/app/review",
        tag: "review",
      });
      await admin.from("planner_profiles").update({ last_review_nudge: today }).eq("user_id", p.user_id);
      stats.nudges++;
    }
  }

  return NextResponse.json({ ok: true, users: active.length, ...stats });
}
