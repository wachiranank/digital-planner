import type { NextRequest } from "next/server";
import { authToken, textReply } from "@/lib/api-token";
import { todayBangkok } from "@/lib/access";
import { numbered, openForToday } from "@/lib/day";

export const dynamic = "force-dynamic";

/** Today's unfinished tasks as short text for the watch / Siri. */
export async function GET(req: NextRequest) {
  const auth = await authToken(req.headers.get("authorization"));
  if (!auth.ok) return textReply(auth.message, auth.status);
  const today = todayBangkok();
  const list = await openForToday(auth.userId, today);
  if (list.length === 0) return textReply("วันนี้ไม่มีงานค้าง 🎉");
  // same order/numbers as the LINE list ("สำคัญ 1 3" refers to these); ★ marks the top 3
  const ordered = list.slice(0, 10);
  return textReply(
    `เหลือ ${list.length} งาน\n${numbered(ordered, today)}${list.length > ordered.length ? `\n…และอีก ${list.length - ordered.length} งาน` : ""}`,
  );
}
