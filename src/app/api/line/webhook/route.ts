import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { lineReply, verifyLineSignature } from "@/lib/line";
import { todayBangkok } from "@/lib/access";
import { parseQuick } from "@/lib/thai-parse";
import { createTaskFor } from "@/lib/tasks";
import { dayStats, eveningText, morningText, moveLeftoversToTomorrow, openForToday, saveDayNote, setTopByNumber } from "@/lib/day";
import { MOODS, moodFromEmoji } from "@/lib/moods";

export const dynamic = "force-dynamic";

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { type: string; userId?: string };
  message?: { type: string; text?: string };
};

const HELP =
  "• พิมพ์ \"วันนี้\" เพื่อดูงานวันนี้ (มีเลขกำกับ)\n• พิมพ์ \"สำคัญ 1 3 4\" เพื่อเลือก 3 งานสำคัญจากเลขในลิสต์\n• พิมพ์ \"ปิดวัน\" เพื่อสรุปวันนี้ / \"ย้ายพรุ่งนี้\" ย้ายงานที่เหลือ / \"บันทึก ...\" จดว่าวันนี้เป็นยังไง\n• พิมพ์ \"เพิ่ม ...\" เพื่อเพิ่มงาน เช่น\n  เพิ่ม ประชุมลูกค้า พรุ่งนี้ บ่าย 2 1 ชม.\n• พิมพ์ \"จด ...\" เพื่อจดไว้ใน Inbox ก่อน (ยังไม่ต้องเลือกวัน) เช่น\n  จด ต่อภาษีรถ\n\nยังไม่ได้เชื่อมบัญชี? เปิดแอป → ตั้งค่า → \"เชื่อม LINE\" แล้วส่งรหัส 6 ตัวมาที่แชทนี้";

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

    const MOOD_QUICK = MOODS.map((m) => `วันนี้ ${m.e}`);

    // 2) "today": numbered list, so the user can pick the top 3 by number
    if (me && /^(วันนี้|today)$/i.test(text)) {
      const today = todayBangkok();
      await lineReply(ev.replyToken, morningText(await openForToday(me.user_id, today), today));
      continue;
    }

    // 2b) pick today's top 3: "สำคัญ 1 3 4" / "สำคัญ 1,3"
    const top = text.match(/^(?:สำคัญ|top)\s*([\d๐-๙\s,]+)$/i);
    if (me && top) {
      const today = todayBangkok();
      const nums = top[1]
        .replace(/[๐-๙]/g, (d) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(d)))
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      const picked = await setTopByNumber(me.user_id, today, nums);
      await lineReply(
        ev.replyToken,
        picked
          ? `🎯 3 งานสำคัญวันนี้\n${picked.map((t, i) => `${i + 1}. ${t.title}`).join("\n")}\n\nสู้ๆ ครับ 💪`
          : 'ไม่พบเลขงานนี้ — พิมพ์ "วันนี้" เพื่อดูเลขงานก่อน',
      );
      continue;
    }

    // 2c) close the day: summary + what's left + mood buttons
    if (me && /^(ปิดวัน|สรุปวันนี้)$/.test(text)) {
      const today = todayBangkok();
      const s = await dayStats(me.user_id, today);
      const left = s.open.filter((t) => !t.recur_id).length;
      await lineReply(ev.replyToken, eveningText(s, today), [...(left ? ["ย้ายพรุ่งนี้"] : []), ...MOOD_QUICK]);
      continue;
    }

    // 2d) move what's left to tomorrow
    if (me && /^ย้าย(ไป)?พรุ่งนี้$/.test(text)) {
      const n = await moveLeftoversToTomorrow(me.user_id, todayBangkok());
      await lineReply(
        ev.replyToken,
        n ? `➡️ ย้าย ${n} งานไปพรุ่งนี้แล้ว พักผ่อนได้เลย 🌙` : "ไม่มีงานค้างให้ย้าย 🎉",
        MOOD_QUICK,
      );
      continue;
    }

    // 2e) how the day felt: "วันนี้ 😄" (quick-reply button) / "บันทึก วันนี้ปิดดีลได้"
    const mood = text.match(/^วันนี้\s*(\S+)$/);
    const moodV = mood ? moodFromEmoji(mood[1]) : null;
    const note = text.match(/^(?:บันทึก|note)\s+([\s\S]+)$/i);
    if (me && (moodV || note)) {
      const today = todayBangkok();
      await saveDayNote(me.user_id, today, moodV ? { mood: moodV } : { note: note![1] });
      await lineReply(
        ev.replyToken,
        moodV ? 'บันทึกแล้ว ✍️ อยากเล่าเพิ่ม พิมพ์ "บันทึก ..." ได้เลย' : "บันทึกแล้ว ✍️ ดูย้อนหลังได้ในหน้า ทบทวน",
      );
      continue;
    }

    // 3) jot into the Inbox: "จด ต่อภาษีรถ" (a named day still wins: "จด ต่อภาษีรถ ศุกร์" → Friday)
    const jot = text.match(/^(?:จด|inbox)\s*(.+)$/i);
    if (me && jot) {
      const p = parseQuick(jot[1], todayBangkok());
      const created = await createTaskFor(me.user_id, { title: p.title, day: p.day, time: p.time, minutes: p.minutes });
      await lineReply(
        ev.replyToken,
        !created
          ? "จดไม่สำเร็จ ลองอีกครั้ง"
          : p.day
            ? `✅ เพิ่มแล้ว: ${p.title}\n📅 ${new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${p.day}T12:00:00Z`))}`
            : `📥 จดไว้ใน Inbox แล้ว: ${p.title}\nเปิดแอป → Inbox เพื่อเลือกวันทีหลัง`,
      );
      continue;
    }

    // 4) quick add: "เพิ่ม ประชุม พรุ่งนี้ 10 โมง" / "+ ซื้อของ"
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
