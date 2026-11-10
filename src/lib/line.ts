import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export const lineConfigured = () => !!(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN);

/** Bot basic ID, e.g. "@123abcde" — used for the add-friend / prefilled-message links. */
export const lineBotId = () => process.env.LINE_BOT_BASIC_ID ?? "";

export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function call(path: string, body: unknown) {
  const res = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

/** Tap-to-send buttons under a message (each sends its own label as text; label ≤ 20 chars, max 13). */
const textMsg = (text: string, quick?: string[]) => ({
  type: "text",
  text: text.slice(0, 5000),
  ...(quick?.length
    ? {
        quickReply: {
          items: quick.slice(0, 13).map((label) => ({
            type: "action",
            action: { type: "message", label: label.slice(0, 20), text: label },
          })),
        },
      }
    : {}),
});

/** Free: answers a message the user just sent. */
export const lineReply = (replyToken: string, text: string, quick?: string[]) =>
  call("reply", { replyToken, messages: [textMsg(text, quick)] });

/** Push: counts toward the Official Account's monthly message quota. */
export const linePush = (to: string, text: string, quick?: string[]) =>
  lineConfigured() ? call("push", { to, messages: [textMsg(text, quick)] }) : Promise.resolve(false);
