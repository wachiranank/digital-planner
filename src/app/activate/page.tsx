import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { activateLicense } from "./actions";

const ERRORS: Record<string, string> = {
  invalid: "license key ไม่ถูกต้อง หรือถูกยกเลิกแล้ว",
  limit: "license นี้ใช้ครบจำนวนบัญชีแล้ว",
  network: "เชื่อมต่อระบบตรวจ license ไม่ได้ ลองใหม่อีกครั้ง",
};

export default async function Activate({ searchParams }: { searchParams: Promise<{ error?: string; key?: string }> }) {
  const { error, key } = await searchParams;
  const prefill = /^DPS-[A-Z0-9-]{4,20}$/i.test(key ?? "") ? key!.toUpperCase() : "";
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const access = await getAccess(user.id, user.email);
  if (access.status === "licensed") redirect("/app");

  const storeUrl = process.env.NEXT_PUBLIC_STORE_URL;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">
        {access.status === "expired" ? "ช่วงทดลองใช้หมดแล้ว" : `เหลือเวลาทดลองใช้ ${access.daysLeft} วัน`}
      </h1>
      <p className="mt-2 text-stone-600">ใส่ license key ที่ได้รับทางอีเมลหลังซื้อ เพื่อใช้งานได้ตลอดชีพ</p>

      {error && ERRORS[error] && <p className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">{ERRORS[error]}</p>}

      <form action={activateLicense} className="mt-6 space-y-3">
        <input
          name="key"
          required
          defaultValue={prefill}
          placeholder="DPS-XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          className="w-full rounded-lg border border-stone-300 px-3 py-3 font-mono tracking-wider uppercase"
        />
        <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700">
          เปิดใช้งาน
        </button>
      </form>

      {storeUrl && (
        <a href={storeUrl} className="mt-6 text-center underline">
          ยังไม่มี license? ซื้อได้ที่นี่
        </a>
      )}
      {access.status === "trial" && (
        <a href="/app" className="mt-3 text-center text-sm text-stone-500 underline">
          ทดลองใช้ต่อก่อน
        </a>
      )}
    </main>
  );
}
