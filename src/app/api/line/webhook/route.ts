import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { lineReply, verifyLineSignature } from "@/lib/line";
import { todayBangkok } from "@/lib/access";
import { parseQuick } from "@/lib/thai-parse";
import { createTaskFor } from "@/lib/tasks";

export const dynamic = "force-dynamic";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
};

const HELP =
  "• พิมพ์ \"วันนี้\" เพื่อดูงานวันนี้\n• พิมพ์ \"เพิ่ม ...\" เพื่อเพิ่มงาน เช่น\n  เพิ่ม ประชุมลูกค้า พรุ่งนี้ บ่าย 2 1 ชม.\n\nยังไม่ได้เชื่อมบัญชี? เปิดแอป → ตั้งค่า → \"เชื่อม LINE\" แล้วส่งรหัส 6 ตัวมาที่แชทนี้";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyLineSignature(raw, req.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }
  const { events = [] } = JSON.parse(raw) as { events?: LineEvent[] };
  const admin = supabaseAdmin();

  for (const ev of events) {
    const lineId = ev.source?.type === "user" ? ev.source.userId : undefined;
    if (!lineId) continue;

    if (ev.type === "unfollow") {
      await admin.from("planner_profiles").update({ line_user_id: null }).eq("line_user_id", lineId);
      continue;
    }
    if (ev.type === "follow" && ev.replyToken) {
      await lineReply(ev.replyToken, `สวัสดีครับ 👋 ระบบแจ้งเตือนของ Planner\n\n${HELP}`);
      continue;
    }
    if (ev.type !== "message" || ev.message?.type !== "text" || !ev.replyToken) continue;

    const text = (ev.message.text ?? "").trim();
    const code = text.toUpperCase().replace(/\s/g, "");

    // 1) link code
    if (/^[A-Z0-9]{6}$/.test(code)) {
      const { data: p } = await admin
        .from("planner_profiles")
        .select("user_id, line_link_expires")
        .eq("line_link_code", code)
        .maybeSingle();
      if (!p || !p.line_link_expires || Date.parse(p.line_link_expires) < Date.now()) {
        await lineReply(ev.replyToken, "รหัสไม่ถูกต้องหรือหมดอายุแล้ว — กด \"เชื่อม LINE\" ในแอปเพื่อรับรหัสใหม่");
        continue;
      }
      // one LINE account ↔ one planner account
      await admin.from("planner_profiles").update({ line_user_id: null }).eq("line_user_id", lineId);
      await admin
        .from("planner_profiles")
        .update({ line_user_id: lineId, line_link_code: null, line_link_expires: null, line_notify: true })
        .eq("user_id", p.user_id);
      await lineReply(ev.replyToken, "✅ เชื่อม LINE สำเร็จ!\nจะแจ้งเตือนก่อนเริ่มงานที่ลงเวลาไว้ สรุปงานตอนเช้า และชวนทบทวนทุกวันอาทิตย์");
      continue;
    }

    const { data: me } = await admin.from("planner_profiles").select("user_id").eq("line_user_id", lineId).maybeSingle();

    // 2) "today" command
    if (me && /^(วันนี้|today)$/i.test(text)) {
      const today = todayBangkok();
      const { data: tasks } = await admin
        .from("planner_tasks")
        .select("title, is_priority, start_at, day")
        .eq("user_id", me.user_id)
        .eq("done", false)
        .lte("day", today)
        .order("start_at", { ascending: true, nullsFirst: false });
      const list = tasks ?? [];
      const time = (s: string) =>
        new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(s));
      const lines = list.map(
        (t) => `${t.is_priority ? "★" : "•"} ${t.start_at && t.day === today ? `${time(t.start_at)} ` : ""}${t.title}`,
      );
      await lineReply(ev.replyToken, list.length ? `งานวันนี้ (${list.length})\n${lines.join("\n")}` : "วันนี้ไม่มีงานค้าง 🎉");
      continue;
    }

    // 3) quick add: "เพิ่ม ประชุม พรุ่งนี้ 10 โมง" / "+ ซื้อของ"
    const add = text.match(/^(?:เพิ่ม|\+|add)\s*(.+)$/i);
    if (me && add) {
      const today = todayBangkok();
      const p = parseQuick(add[1], today);
      const day = p.day ?? today;
      const created = await createTaskFor(me.user_id, { title: p.title, day, time: p.time, minutes: p.minutes });
      if (!created) {
        await lineReply(ev.replyToken, "เพิ่มงานไม่สำเร็จ ลองอีกครั้ง");
        continue;
      }
      const when =
        day === today
          ? "วันนี้"
          : new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
              new Date(`${day}T12:00:00Z`),
            );
      const hm = (iso: string) =>
        new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(iso));
      const slot = created.start && created.end ? ` ${hm(created.start)}–${hm(created.end)}` : "";
      await lineReply(
        ev.replyToken,
        `✅ เพิ่มแล้ว: ${p.title}\n📅 ${when}${slot}${created.calendar ? "\n🗓️ ลง Google Calendar แล้ว" : ""}`,
      );
      continue;
    }

    await lineReply(ev.replyToken, me ? HELP : `ยังไม่ได้เชื่อมบัญชี — เปิดแอป → ตั้งค่า → "เชื่อม LINE" แล้วส่งรหัส 6 ตัวมาที่แชทนี้`);
  }
  return NextResponse.json({ ok: true });
}
