import Link from "next/link";

export const OPERATOR_TH = "ClaudeCoach โดย วชิรานันท์ ขันเงิน";
export const OPERATOR_EN = "ClaudeCoach, operated by Wachiranan Khanngern";
export const SUPPORT_EMAIL = "wachiranan.khanngern@gmail.com";
export const UPDATED_TH = "11 พฤศจิกายน 2569";
export const UPDATED_EN = "November 11, 2026";

/** Shared frame for the public legal pages (privacy, terms). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 leading-relaxed text-stone-800">
      <Link href="/" className="text-sm text-brand-700 hover:underline">
        ← Digital Planner
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 space-y-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
      <p className="mt-12 border-t border-stone-200 pt-4 text-sm text-stone-500">
        <Link href="/privacy" className="underline">
          นโยบายความเป็นส่วนตัว / Privacy Policy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="underline">
          เงื่อนไขการใช้งาน / Terms of Service
        </Link>{" "}
        · <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">{SUPPORT_EMAIL}</a>
      </p>
    </main>
  );
}
