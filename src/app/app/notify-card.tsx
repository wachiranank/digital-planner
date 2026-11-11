"use client";

import { useEffect, useState, useTransition } from "react";
import { removePushSub, savePushSub, sendTestPush, setReminderPrefs } from "./notify-actions";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function NotifyCard({
  vapidKey,
  remindMinutes,
}: {
  vapidKey: string;
  remindMinutes: number;
}) {
  const [state, setState] = useState<State>("loading");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  const enable = () =>
    start(async () => {
      setMsg("");
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidKey) });
        const res = await savePushSub(JSON.parse(JSON.stringify(sub)));
        setState(res.ok ? "on" : "off");
        if (res.ok) {
          const { sent } = await sendTestPush();
          setMsg(sent ? "ส่งแจ้งเตือนทดสอบแล้ว" : "เปิดแล้ว แต่ส่งทดสอบไม่สำเร็จ");
        }
      } catch {
        setMsg("เปิดการแจ้งเตือนไม่สำเร็จ ลองอีกครั้ง");
      }
    });

  const disable = () =>
    start(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSub(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("");
    });

  const test = () =>
    start(async () => {
      const { sent } = await sendTestPush();
      setMsg(sent ? `ส่งแล้ว (${sent} อุปกรณ์)` : "ส่งไม่สำเร็จ — ลองปิดแล้วเปิดใหม่");
    });

  if (state === "loading") return null;

  return (
    <section className="rounded-xl bg-white p-4 text-sm ring-1 ring-stone-200">

      {state === "ios-install" && (
        <p className="text-stone-600">
          บน iPhone/iPad ต้องติดตั้งแอปก่อน: กดปุ่มแชร์ใน Safari → <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วเปิดแอปจากไอคอน
        </p>
      )}
      {state === "unsupported" && <p className="text-stone-600">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน</p>}
      {state === "denied" && (
        <p className="text-stone-600">การแจ้งเตือนถูกปิดในตั้งค่าเบราว์เซอร์/เครื่อง — เปิดอนุญาตแล้วโหลดหน้าใหม่</p>
      )}
      {state === "off" && (
        <>
          <p className="text-stone-600">ยังไม่ได้เปิดบนเครื่องนี้ (เปิดแยกในแต่ละอุปกรณ์)</p>
          <button
            onClick={enable}
            disabled={pending}
            className="mt-3 rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            เปิดการแจ้งเตือนบนเครื่องนี้
          </button>
        </>
      )}
      {state === "on" && (
        <form action={setReminderPrefs} className="space-y-2">
          <label className="flex items-center justify-between gap-2">
            <span>เตือนก่อนเริ่มงาน</span>
            <select
              name="remind_minutes"
              defaultValue={remindMinutes}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="rounded-md border border-stone-300 bg-white px-2 py-1"
            >
              <option value={0}>ตอนเริ่ม</option>
              <option value={5}>5 นาที</option>
              <option value={10}>10 นาที</option>
              <option value={15}>15 นาที</option>
              <option value={30}>30 นาที</option>
              <option value={60}>1 ชั่วโมง</option>
            </select>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={test} disabled={pending} className="text-brand-700 underline">
              ส่งทดสอบ
            </button>
            <button type="button" onClick={disable} disabled={pending} className="text-stone-500 underline">
              ปิดบนเครื่องนี้
            </button>
          </div>
        </form>
      )}
      {msg && <p className="mt-2 text-stone-500">{msg}</p>}
    </section>
  );
}
