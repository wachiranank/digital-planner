import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { GoogleButton } from "./google-button";
import { publicStoreUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: "🗓️", title: "ซิงก์ Google Calendar 2 ทาง", body: "ลงเวลางานแล้วขึ้นในปฏิทินทันที ย้าย/ลบใน Google ก็อัปเดตกลับมา ไม่ต้องจดซ้ำสองที่" },
  { icon: "⭐", title: "งานสำคัญ 3 อย่างต่อวัน", body: "บังคับโฟกัสเฉพาะสิ่งที่สำคัญจริง งานที่ไม่เสร็จยกไปวันถัดไปให้อัตโนมัติ" },
  { icon: "🔔", title: "เตือนทาง LINE และแจ้งเตือนบนเครื่อง", body: "เตือนก่อนเริ่มงาน สรุปงานตอนเช้า พิมพ์ \"วันนี้\" ในแชท LINE เพื่อดูงานได้ทุกเมื่อ" },
  { icon: "📊", title: "ทบทวนรายสัปดาห์", body: "ดูอัตราสำเร็จ เวลาโฟกัส งานค้าง แล้วตั้งโฟกัสสัปดาห์หน้าในไม่กี่นาที" },
  { icon: "📱", title: "iPad มือถือ และคอม", body: "ติดตั้งเป็นแอปลงหน้าจอโฮมได้ ข้อมูลตรงกันทุกเครื่อง" },
  { icon: "💳", title: "จ่ายครั้งเดียว ใช้ได้ตลอด", body: "ไม่มีค่ารายเดือน จ่ายด้วยบัตรหรือพร้อมเพย์" },
];

const FAQ = [
  ["ทดลองใช้ต้องใส่บัตรไหม?", "ไม่ต้อง ล็อกอินด้วย Google แล้วใช้ได้ทุกฟีเจอร์ 14 วัน"],
  ["ซื้อแล้วเปิดใช้งานยังไง?", "ล็อกอินด้วยอีเมล Google เดียวกับที่ใช้ซื้อ ระบบเปิดให้อัตโนมัติ หรือใส่ license key ที่หน้าชำระเงินสำเร็จ"],
  ["ข้อมูลปฏิทินของฉันปลอดภัยไหม?", "แอปเข้าถึงเฉพาะ event ในปฏิทิน เพื่อแสดงและสร้างนัดจากงานของคุณ ไม่ขายหรือแชร์ข้อมูลให้ใคร"],
  ["ใช้ได้กี่เครื่อง?", "1 บัญชี Google ใช้ได้ทุกเครื่องของคุณ"],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { next } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : undefined;
  if (user) redirect(safeNext ?? "/app");

  // live price from the store's catalogue (same database)
  const { data: product } = await supabaseAdmin()
    .from("products")
    .select("price_satang")
    .eq("slug", "planner-early-bird")
    .eq("is_active", true)
    .maybeSingle();
  const price = product ? Math.round(product.price_satang / 100).toLocaleString("th-TH") : null;
  const storeUrl = publicStoreUrl();

  return (
    <main className="mx-auto max-w-5xl px-5">
      <section className="flex min-h-[85dvh] flex-col justify-center py-12 md:max-w-2xl">
        <p className="text-sm font-semibold text-brand-700">Digital Planner ภาษาไทย</p>
        <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">
          วางแผนวันละ 1 นาที
          <br />
          <span className="text-brand-700">ไม่ต้องจดซ้ำสองที่</span>
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          Planner ที่ซิงก์กับ Google Calendar เตือนทาง LINE และยกงานค้างให้อัตโนมัติ ใช้ได้ทั้ง iPad มือถือ และคอม
        </p>
        <div className="mt-8 max-w-sm">
          <GoogleButton label="ทดลองใช้ฟรี 14 วัน" next={safeNext} />
          <p className="mt-2 text-center text-sm text-stone-500">ล็อกอินด้วย Google · ไม่ต้องใส่บัตร</p>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl bg-white p-5 ring-1 ring-stone-200">
            <div className="text-2xl">{f.icon}</div>
            <h2 className="mt-2 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-stone-600">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-md pb-16 text-center">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-2 ring-brand-500">
          <p className="text-sm font-semibold text-brand-700">ราคา Early Bird · 100 คนแรก</p>
          {price && (
            <p className="mt-2 text-4xl font-bold">
              ฿{price} <span className="text-base font-normal text-stone-500">จ่ายครั้งเดียว</span>
            </p>
          )}
          <p className="mt-1 text-sm text-stone-500">ราคาปกติ ฿590</p>
          <div className="mt-5 space-y-2">
            <GoogleButton label="ทดลองใช้ฟรีก่อน" next={safeNext} />
            {storeUrl && (
              <a href={storeUrl} className="block rounded-xl px-4 py-3 font-semibold text-brand-700 ring-1 ring-brand-600">
                ซื้อเลย (บัตร / พร้อมเพย์)
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-2xl pb-20">
        <h2 className="text-xl font-bold">คำถามที่พบบ่อย</h2>
        <dl className="mt-4 divide-y divide-stone-200 rounded-2xl bg-white ring-1 ring-stone-200">
          {FAQ.map(([q, a]) => (
            <div key={q} className="p-4">
              <dt className="font-medium">{q}</dt>
              <dd className="mt-1 text-sm text-stone-600">{a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-center text-sm text-stone-500">
          <a href="/privacy" className="underline">นโยบายความเป็นส่วนตัว</a> ·{" "}
          <a href="/terms" className="underline">เงื่อนไขการใช้งาน</a> ·{" "}
          <a href="mailto:support@claudecoach.online" className="underline">support@claudecoach.online</a>
        </p>
        {/* for Google's OAuth reviewers (and English readers): what the app is and why it uses Calendar */}
        <p lang="en" className="mx-auto mt-4 max-w-xl text-center text-xs leading-relaxed text-stone-500">
          Digital Planner by ClaudeCoach is a Thai daily planner. Sign in with Google, plan your day, and optionally connect Google
          Calendar: tasks you give a time are added to your calendar, and your events appear in the planner so you can plan around them.{" "}
          <a href="/privacy" className="underline">Privacy Policy</a> · <a href="/terms" className="underline">Terms of Service</a>
        </p>
      </section>
    </main>
  );
}
