"use client";

import { useState, useTransition } from "react";
import { createLineLinkCode, sendTestLine, setLineNotify, unlinkLine } from "./notify-actions";

export function LineCard({ linked, notify, botId }: { linked: boolean; notify: boolean; botId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const id = encodeURIComponent(botId);

  return (
    <section className="rounded-xl bg-white p-4 text-sm ring-1 ring-stone-200">

      {linked ? (
        <div className="space-y-2">
          <p className="text-emerald-700">✓ เชื่อมแล้ว — พิมพ์ &quot;วันนี้&quot; ในแชทเพื่อดูงานได้ทุกเมื่อ</p>
          <label className="flex items-center justify-between gap-2">
            <span>ส่งแจ้งเตือนทาง LINE</span>
            <input
              type="checkbox"
              defaultChecked={notify}
              onChange={(e) => start(() => setLineNotify(e.currentTarget.checked))}
              className="h-5 w-5 accent-emerald-600"
            />
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => start(async () => setMsg((await sendTestLine()).ok ? "ส่งแล้ว ✓" : "ส่งไม่สำเร็จ"))}
              disabled={pending}
              className="text-emerald-700 underline"
            >
              ส่งทดสอบ
            </button>
            <button onClick={() => start(() => unlinkLine())} disabled={pending} className="text-stone-500 underline">
              ยกเลิกการเชื่อม
            </button>
          </div>
        </div>
      ) : code ? (
        <div className="space-y-2">
          <p className="text-stone-600">ส่งรหัสนี้ไปที่ LINE {botId} (หมดอายุใน 15 นาที)</p>
          <p className="rounded-lg bg-stone-100 py-2 text-center font-mono text-2xl font-bold tracking-[0.3em]">{code}</p>
          <a
            href={`https://line.me/R/oaMessage/${id}/?${encodeURIComponent(code)}`}
            target="_blank"
            rel="noopener"
            className="block rounded-lg bg-[#06C755] py-2 text-center font-semibold text-white"
          >
            เปิด LINE และส่งรหัส
          </a>
          <p className="text-xs text-stone-500">
            ยังไม่ได้เพิ่มเพื่อน?{" "}
            <a href={`https://line.me/R/ti/p/${id}`} target="_blank" rel="noopener" className="underline">
              เพิ่มเพื่อน {botId}
            </a>{" "}
            ก่อน · ส่งแล้วโหลดหน้านี้ใหม่
          </p>
        </div>
      ) : (
        <>
          <p className="text-stone-600">รับแจ้งเตือนงาน สรุปตอนเช้า และดูงานวันนี้ผ่านแชท LINE</p>
          <button
            onClick={() =>
              start(async () => {
                const r = await createLineLinkCode();
                if (r.code) setCode(r.code);
                else setMsg("สร้างรหัสไม่สำเร็จ ลองอีกครั้ง");
              })
            }
            disabled={pending}
            className="mt-3 rounded-lg bg-[#06C755] px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            เชื่อม LINE
          </button>
        </>
      )}
      {msg && <p className="mt-2 text-stone-500">{msg}</p>}
    </section>
  );
}
