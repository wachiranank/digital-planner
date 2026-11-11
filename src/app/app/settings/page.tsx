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
import { NotifyCard } from "../notify-card";
import { RoutinePrefs } from "../routine-prefs";
import { WatchCard, type TokenRow } from "../watch-card";
import { appHost } from "@/lib/env";
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

  const [access, tags, { data: prefs }, token, { data: apiTokens }] = await Promise.all([
    getAccess(user.id, user.email),
    getTags(supabase),
    supabase
      .from("planner_profiles")
      .select("remind_minutes, daily_digest, evening_review, line_user_id, line_notify, license_key")
      .eq("user_id", user.id)
      .maybeSingle(),
    getAccessToken(user.id),
    supabase.from("planner_api_tokens").select("id, name, prefix, created_at, last_used_at").order("created_at"),
  ]);
  const appUrl = (process.env.APP_URL || `https://${appHost()}`).replace(/\/$/, "");
  const vapidKey = process.env.VAPID_PUBLIC_KEY ?? "";
  const line = lineConfigured() && !!lineBotId();

  return (
    <main className="mx-auto max-w-2xl px-5 pb-10 pt-6 lg:px-10 lg:pt-8">
      <h1 className="text-[32px] font-bold leading-tight tracking-tight">ตั้งค่า</h1>

      <nav className="mt-3 flex flex-wrap gap-2 text-sm">
        {[
          ["#routine", "🌗 เช้า–เย็น"],
          ["#notify", "🔔 การแจ้งเตือน"],
          ["#watch", "⌚ Apple Watch & Siri"],
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
        <Section id="routine" title="ตัวช่วยวางแผนรายวัน" hint="ส่งทางแจ้งเตือนบนเครื่องและ LINE (ถ้าเชื่อมไว้)">
          <RoutinePrefs dailyDigest={prefs?.daily_digest ?? true} eveningReview={prefs?.evening_review ?? true} />
        </Section>

        <Section id="notify" title="การแจ้งเตือนบนเครื่อง" hint="เตือนก่อนเริ่มงาน สรุปงานตอนเช้า และชวนทบทวนทุกวันอาทิตย์">
          {vapidKey ? (
            <NotifyCard
              vapidKey={vapidKey}
              remindMinutes={prefs?.remind_minutes ?? 10}
            />
          ) : (
            <p className="text-sm text-stone-500">ยังไม่ได้ตั้งค่า</p>
          )}
        </Section>

        <Section id="watch" title="Apple Watch & Siri" hint="แจ้งเตือนบนข้อมือ และพูดเพิ่มงานด้วย Siri">
          <WatchCard
            appUrl={appUrl}
            tokens={(apiTokens ?? []) as TokenRow[]}
            shortcutAddUrl={process.env.SHORTCUT_ADD_URL ?? ""}
            shortcutTodayUrl={process.env.SHORTCUT_TODAY_URL ?? ""}
          />
        </Section>

        {line && (
          <Section id="line" title="LINE" hint="รับแจ้งเตือนทางแชท พิมพ์ &quot;วันนี้&quot; ดูงาน, &quot;เพิ่ม ...&quot; เพิ่มงาน, &quot;จด ...&quot; ลง Inbox, &quot;ปิดวัน&quot; สรุปวันนี้">
            <LineCard linked={!!prefs?.line_user_id} notify={prefs?.line_notify ?? true} botId={lineBotId()} />
          </Section>
        )}

        <Section id="calendar" title="Google Calendar">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 text-sm ring-1 ring-stone-200">
            {token ? (
              <span className="text-brand-700">✓ เชื่อมแล้ว — งานที่ลงเวลาจะขึ้นในปฏิทินอัตโนมัติ</span>
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
                <span className="font-medium text-brand-700">✓ ใช้งานตลอดชีพ</span>
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
