import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getAccess } from "@/lib/access";
import { isAdmin } from "@/lib/admin";
import { getAccessToken } from "@/lib/google";
import { getTags } from "@/lib/tags-server";
import { lineBotId, lineConfigured } from "@/lib/line";
import { GoogleButton } from "../../google-button";
import { signOut } from "../actions";
import { AppNav } from "../nav";
import { NotifyCard } from "../notify-card";
import { LineCard } from "../line-card";
import { TagManager } from "./tag-manager";

export const dynamic = "force-dynamic";

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-stone-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function Settings() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [access, tags, { data: prefs }, token] = await Promise.all([
    getAccess(user.id, user.email),
    getTags(supabase),
    supabase
      .from("planner_profiles")
      .select("remind_minutes, daily_digest, line_user_id, line_notify, license_key")
      .eq("user_id", user.id)
      .maybeSingle(),
    getAccessToken(user.id),
  ]);
  const vapidKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const line = lineConfigured() && !!lineBotId();

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 md:py-10">
      <AppNav active="settings" />
      <h1 className="mt-6 text-2xl font-bold">ตั้งค่า</h1>

      <nav className="mt-3 flex flex-wrap gap-2 text-sm">
        {[
          ["#notify", "🔔 การแจ้งเตือน"],
          ...(line ? [["#line", "💬 LINE"]] : []),
          ["#calendar", "🗓️ Google Calendar"],
          ["#tags", "🏷️ หมวดหมู่"],
          ["#account", "👤 บัญชี"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200 hover:bg-stone-100">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-8 space-y-10">
        <Section id="notify" title="การแจ้งเตือนบนเครื่อง" hint="เตือนก่อนเริ่มงาน สรุปงานตอนเช้า และชวนทบทวนทุกวันอาทิตย์">
          {vapidKey ? (
            <NotifyCard
              vapidKey={vapidKey}
              remindMinutes={prefs?.remind_minutes ?? 10}
              dailyDigest={prefs?.daily_digest ?? true}
            />
          ) : (
            <p className="text-sm text-stone-500">ยังไม่ได้ตั้งค่า</p>
          )}
        </Section>

        {line && (
          <Section id="line" title="LINE" hint="รับแจ้งเตือนทางแชท พิมพ์ &quot;วันนี้&quot; เพื่อดูงาน หรือ &quot;เพิ่ม ...&quot; เพื่อเพิ่มงาน">
            <LineCard linked={!!prefs?.line_user_id} notify={prefs?.line_notify ?? true} botId={lineBotId()} />
          </Section>
        )}

        <Section id="calendar" title="Google Calendar">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 text-sm ring-1 ring-stone-200">
            {token ? (
              <span className="text-emerald-700">✓ เชื่อมแล้ว — งานที่ลงเวลาจะขึ้นในปฏิทินอัตโนมัติ</span>
            ) : (
              <>
                <span className="text-stone-600">ยังไม่ได้เชื่อม (หรือหมดอายุ) — เชื่อมเพื่อดูนัดและลงเวลางาน</span>
                <GoogleButton label="เชื่อม Calendar" variant="subtle" next="/app/settings#calendar" />
              </>
            )}
          </div>
        </Section>

        <Section id="tags" title="หมวดหมู่" hint="สร้างหมวดของคุณเองพร้อมสี ใช้จัดกลุ่มงานในทุกหน้า">
          <TagManager tags={tags} />
        </Section>

        <Section id="account" title="บัญชี">
          <div className="divide-y divide-stone-100 rounded-xl bg-white text-sm ring-1 ring-stone-200">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-stone-500">อีเมล</span>
              <span className="truncate font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-stone-500">สถานะ</span>
              {access.status === "licensed" ? (
                <span className="font-medium text-emerald-700">✓ ใช้งานตลอดชีพ</span>
              ) : (
                <Link href="/activate" className="font-medium text-amber-700 underline">
                  {access.status === "trial" ? `ทดลองใช้ เหลือ ${access.daysLeft} วัน · ใส่ license` : "หมดช่วงทดลอง · ใส่ license"}
                </Link>
              )}
            </div>
            {prefs?.license_key && (
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-stone-500">License key</span>
                <span className="font-mono">{prefs.license_key}</span>
              </div>
            )}
            {isAdmin(user.email) && (
              <Link href="/app/admin" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                <span className="font-medium">🛠️ Admin · สร้าง key ฟรี</span>
                <span className="text-stone-400">›</span>
              </Link>
            )}
            <form action={signOut} className="px-4 py-3">
              <button className="text-red-600 hover:underline">ออกจากระบบ</button>
            </form>
          </div>
        </Section>
      </div>
    </main>
  );
}
