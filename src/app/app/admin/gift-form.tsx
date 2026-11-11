"use client";

import { useActionState, useState } from "react";
import { createGift, type GiftResult } from "./actions";

export function GiftForm({ products, appUrl }: { products: { id: string; name: string }[]; appUrl: string }) {
  const [state, action, pending] = useActionState<GiftResult, FormData>(createGift, null);
  const [copied, setCopied] = useState<"" | "key" | "msg">("");

  const message =
    state?.ok &&
    `🎁 ของขวัญ Digital Planner ใช้ฟรีตลอดชีพ\n\n1) เข้า ${appUrl}\n2) Login ด้วย Google ที่ใช้อีเมล ${state.email}\n   (ระบบเปิดใช้งานให้อัตโนมัติ)\n\nหรือกรอก key เอง: ${state.key}`;

  const copy = async (text: string, what: "key" | "msg") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-stone-200">
        <label className="block text-sm">
          <span className="text-stone-600">อีเมลเพื่อน (อีเมลที่ใช้ login Google)</span>
          <input
            name="email"
            type="email"
            required
            placeholder="friend@gmail.com"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        {products.length > 1 ? (
          <label className="block text-sm">
            <span className="text-stone-600">สินค้า</span>
            <select name="product" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="product" value={products[0]?.id ?? ""} />
        )}
        <button
          disabled={pending || products.length === 0}
          className="w-full rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {pending ? "กำลังสร้าง…" : "🎁 สร้าง key ฟรี"}
        </button>
        {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      </form>

      {state?.ok && message && (
        <div className="space-y-3 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200">
          <p className="text-sm text-brand-800">สร้างแล้วสำหรับ {state.email}</p>
          <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-brand-200">
            <span className="font-mono text-lg">{state.key}</span>
            <button onClick={() => copy(state.key, "key")} className="text-sm font-medium text-brand-700">
              {copied === "key" ? "คัดลอกแล้ว ✓" : "คัดลอก key"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm ring-1 ring-brand-200">{message}</pre>
          <button
            onClick={() => copy(message, "msg")}
            className="w-full rounded-lg bg-brand-600 px-4 py-2 font-medium text-white"
          >
            {copied === "msg" ? "คัดลอกแล้ว ✓" : "📋 คัดลอกข้อความส่งเพื่อน (วางใน LINE ได้)"}
          </button>
        </div>
      )}
    </div>
  );
}
