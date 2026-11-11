import type { NextRequest } from "next/server";
import { authToken, textReply } from "@/lib/api-token";
import { todayBangkok } from "@/lib/access";
import { parseQuick } from "@/lib/thai-parse";
import { createTaskFor } from "@/lib/tasks";

export const dynamic = "force-dynamic";

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T12:00:00Z`),
  );

/**
 * Add a task from Siri / Apple Watch: POST {"text": "ประชุม พรุ่งนี้ 10 โมง", "inbox": false}
 * (plain-text body also works). No day in the text → today, or the Inbox when inbox is true.
 */
export async function POST(req: NextRequest) {
  const auth = await authToken(req.headers.get("authorization"));
  if (!auth.ok) return textReply(auth.message, auth.status);

  let text = "";
  let inbox = false;
  const raw = (await req.text()).slice(0, 2000);
  try {
    const body = JSON.parse(raw) as { text?: unknown; inbox?: unknown };
    text = typeof body.text === "string" ? body.text : "";
    inbox = body.inbox === true || body.inbox === "true" || body.inbox === 1;
  } catch {
    text = raw; // plain text
  }
  text = text.replace(/\s+/g, " ").trim().slice(0, 500);
  if (!text) return textReply("ไม่ได้ยินชื่องาน ลองพูดใหม่อีกครั้ง", 400);

  const today = todayBangkok();
  const p = parseQuick(text, today);
  const day = p.day ?? (inbox ? null : today);
  const created = await createTaskFor(auth.userId, { title: p.title, day, time: p.time, minutes: p.minutes });
  if (!created) return textReply("เพิ่มงานไม่สำเร็จ ลองใหม่อีกครั้ง", 500);

  if (!day) return textReply(`จดลง Inbox แล้ว: ${p.title}`);
  const when = `${day === today ? "วันนี้" : dayLabel(day)}${p.time ? ` ${p.time} น.` : ""}`;
  return textReply(`เพิ่มแล้ว: ${p.title} (${when})`);
}
