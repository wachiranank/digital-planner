"use client";

import { useState, useTransition } from "react";
import { createApiToken, revokeApiToken } from "./watch-actions";

export type TokenRow = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null };

const when = (iso: string) =>
  new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(
    new Date(iso),
  );

function Copy({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded bg-stone-100 px-2 py-1 font-mono text-xs text-stone-800">{label ?? value}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(value).then(() => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          });
        }}
        className="shrink-0 rounded-md bg-white px-2 py-1 text-xs ring-1 ring-stone-200 hover:bg-stone-100"
      >
        {done ? "คัดลอกแล้ว ✓" : "คัดลอก"}
      </button>
    </span>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-white">{n}</span>
      <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
    </li>
  );
}

/** Settings: get notifications on Apple Watch, and add/see tasks from the wrist with Siri Shortcuts. */
export function WatchCard({
  appUrl,
  tokens,
  shortcutAddUrl,
  shortcutTodayUrl,
}: {
  appUrl: string;
  tokens: TokenRow[];
  shortcutAddUrl: string;
  shortcutTodayUrl: string;
}) {
  const [pending, start] = useTransition();
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const addUrl = `${appUrl}/api/v1/tasks`;
  const todayUrl = `${appUrl}/api/v1/today`;
  const auth = `Bearer ${fresh ?? "<token ของคุณ>"}`;

  return (
    <div className="space-y-4 text-sm">
      {/* A) notifications on the watch */}
      <details className="group rounded-xl bg-white p-4 ring-1 ring-stone-200" open>
        <summary className="cursor-pointer list-none font-semibold">
          🔔 ให้แจ้งเตือนขึ้นบน Apple Watch <span className="font-normal text-stone-400 group-open:hidden">(แตะเพื่อดู)</span>
        </summary>
        <ol className="mt-3 space-y-3 text-stone-700">
          <Step n={1}>
            เปิดแอปนี้ใน <b>Safari</b> บน iPhone → ปุ่มแชร์ <span aria-hidden>⬆️</span> → <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วเปิดแอปจากไอคอนบนหน้าจอโฮม
            <span className="block text-xs text-stone-500">iPhone ส่งแจ้งเตือนจากเว็บได้เฉพาะแอปที่อยู่บนหน้าจอโฮม (iOS 16.4 ขึ้นไป)</span>
          </Step>
          <Step n={2}>
            ในแอป ไปที่ ⚙️ ตั้งค่า → <b>การแจ้งเตือนบนเครื่อง</b> → เปิดการแจ้งเตือน แล้วกด <b>ส่งทดสอบ</b>
          </Step>
          <Step n={3}>
            แอป <b>Watch</b> บน iPhone → <b>การแจ้งเตือน</b> → เลื่อนหา Planner (และ LINE ถ้าใช้) → เลือก <b>สะท้อนการแจ้งเตือนจาก iPhone</b>
            <span className="block text-xs text-stone-500">แจ้งเตือนขึ้นที่นาฬิกาเมื่อ iPhone ล็อกจออยู่และใส่นาฬิกาไว้</span>
          </Step>
          <Step n={4}>
            (ไม่บังคับ) ดูนัดถัดไปบนหน้าปัด: iPhone ตั้งค่า → ปฏิทิน → บัญชี → เพิ่มบัญชี Google เดียวกับที่ใช้ในแอป
            แล้วเพิ่ม complication <b>ปฏิทิน</b> บนหน้าปัดนาฬิกา — งานที่ลงเวลาไว้จะขึ้นให้เห็นทั้งวัน
          </Step>
        </ol>
      </details>

      {/* B) Siri Shortcuts */}
      <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
        <p className="font-semibold">🎙️ สั่งงานจากข้อมือด้วย Siri</p>
        <p className="mt-1 text-stone-600">
          ยกข้อมือแล้วพูด <b>&quot;เพิ่มงาน&quot;</b> → พูดชื่องาน เช่น &quot;ประชุมลูกค้า พรุ่งนี้ บ่ายสอง&quot; งานจะเข้า planner ทันที หรือพูด{" "}
          <b>&quot;งานวันนี้&quot;</b> เพื่อดูงานที่เหลือ ใช้ได้ทั้งบน Apple Watch และ iPhone
        </p>

        {/* tokens */}
        <div className="mt-4 rounded-lg bg-stone-50 p-3">
          <p className="text-xs font-semibold text-stone-500">ขั้นแรก: สร้างรหัสเชื่อมต่อ (token)</p>
          {fresh ? (
            <div className="mt-2 space-y-1.5">
              <Copy value={fresh} />
              <p className="text-xs text-amber-700">
                ⚠️ คัดลอกเก็บไว้ตอนนี้ — ระบบจะไม่แสดงรหัสนี้อีก ใครมีรหัสนี้เพิ่มและดูงานของคุณได้ อย่าส่งให้คนอื่น
              </p>
            </div>
          ) : (
            <button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError("");
                  const r = await createApiToken("Siri / Apple Watch");
                  if (r.token) setFresh(r.token);
                  else setError(r.error ?? "");
                })
              }
              className="mt-2 rounded-lg bg-emerald-600 px-4 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              สร้าง token
            </button>
          )}
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          {tokens.length > 0 && (
            <ul className="mt-3 divide-y divide-stone-200 border-t border-stone-200 text-xs">
              {tokens.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-stone-600">
                    <code className="font-mono">{t.prefix}…</code> · {t.name} · สร้าง {when(t.created_at)}
                    {" · "}
                    {t.last_used_at ? `ใช้ล่าสุด ${when(t.last_used_at)}` : "ยังไม่เคยใช้"}
                  </span>
                  {confirmId === t.id ? (
                    <span className="flex gap-2">
                      <button
                        disabled={pending}
                        onClick={() => start(() => revokeApiToken(t.id))}
                        className="rounded bg-red-600 px-2 py-0.5 text-white"
                      >
                        ยืนยันยกเลิก
                      </button>
                      <button onClick={() => setConfirmId(null)} className="text-stone-500 underline">
                        ไม่
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmId(t.id)} className="text-stone-500 underline hover:text-red-600">
                      ยกเลิก
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* install */}
        {(shortcutAddUrl || shortcutTodayUrl) && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-stone-500">ขั้นที่สอง: ติดตั้ง Shortcut (เปิดลิงก์บน iPhone)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {shortcutAddUrl && (
                <a href={shortcutAddUrl} className="rounded-lg bg-stone-800 px-3 py-1.5 font-semibold text-white hover:bg-stone-900">
                  ➕ ติดตั้ง &quot;เพิ่มงาน&quot;
                </a>
              )}
              {shortcutTodayUrl && (
                <a href={shortcutTodayUrl} className="rounded-lg bg-stone-800 px-3 py-1.5 font-semibold text-white hover:bg-stone-900">
                  📋 ติดตั้ง &quot;งานวันนี้&quot;
                </a>
              )}
            </div>
            <p className="mt-1.5 text-xs text-stone-500">ตอนติดตั้ง Shortcuts จะถามหา token — วางรหัสจากขั้นแรก</p>
          </div>
        )}

        {/* build it yourself */}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-stone-500">
            {shortcutAddUrl || shortcutTodayUrl ? "หรือสร้าง Shortcut เอง (ขั้นละเอียด)" : "ขั้นที่สอง: สร้าง Shortcut ในแอปคำสั่งลัด (Shortcuts) บน iPhone"}
          </summary>
          <p className="mt-2 text-xs text-stone-500">ชื่อ action อาจต่างเล็กน้อยตามภาษาของเครื่อง (ไทย / อังกฤษ)</p>

          <p className="mt-3 font-medium">Shortcut &quot;เพิ่มงาน&quot;</p>
          <ol className="mt-2 space-y-3 text-stone-700">
            <Step n={1}>
              แอป <b>คำสั่งลัด</b> → <b>+</b> → ตั้งชื่อ <b>เพิ่มงาน</b>
            </Step>
            <Step n={2}>
              เพิ่ม action <b>เขียนตามคำบอก</b> (Dictate Text) → ตั้งภาษาเป็น <b>ไทย</b>
            </Step>
            <Step n={3}>
              เพิ่ม action <b>รับเนื้อหาของ URL</b> (Get Contents of URL) แล้วใส่ URL:
              <Copy value={addUrl} />
              แตะ <b>แสดงเพิ่มเติม</b>: วิธี = <b>POST</b> · Header ชื่อ <code className="text-xs">Authorization</code> ค่า:
              <Copy value={auth} label={fresh ? `Bearer ${fresh.slice(0, 10)}…` : auth} />
              เนื้อหาคำขอ = <b>JSON</b> → เพิ่มฟิลด์ข้อความ ชื่อ <code className="text-xs">text</code> ค่า = <b>ข้อความที่บอก</b> (ตัวแปรจากขั้นที่ 2)
              <span className="block text-xs text-stone-500">
                อยากให้งานที่ไม่ระบุวันเข้า Inbox แทนวันนี้: เพิ่มฟิลด์ Boolean ชื่อ <code>inbox</code> = จริง
              </span>
            </Step>
            <Step n={4}>
              เพิ่ม action <b>แสดงผลลัพธ์</b> (Show Result) → ใส่ <b>เนื้อหาของ URL</b>
            </Step>
            <Step n={5}>
              แตะ <b>ⓘ</b> ด้านล่าง → เปิด <b>แสดงบน Apple Watch</b> → เสร็จ
            </Step>
          </ol>

          <p className="mt-4 font-medium">Shortcut &quot;งานวันนี้&quot;</p>
          <ol className="mt-2 space-y-3 text-stone-700">
            <Step n={1}>
              สร้างคำสั่งลัดใหม่ชื่อ <b>งานวันนี้</b> → action <b>รับเนื้อหาของ URL</b>:
              <Copy value={todayUrl} />
              วิธี = <b>GET</b> · Header <code className="text-xs">Authorization</code> ค่าเดียวกับด้านบน
            </Step>
            <Step n={2}>
              เพิ่ม <b>แสดงผลลัพธ์</b> → <b>เนื้อหาของ URL</b> → เปิด <b>แสดงบน Apple Watch</b>
            </Step>
          </ol>

          <p className="mt-4 text-xs text-stone-500">
            ใช้งาน: บอก Siri ว่า &quot;เพิ่มงาน&quot; หรือ &quot;งานวันนี้&quot; · หรือเพิ่ม complication <b>คำสั่งลัด</b> บนหน้าปัดเพื่อแตะครั้งเดียว
          </p>
        </details>
      </div>
    </div>
  );
}
