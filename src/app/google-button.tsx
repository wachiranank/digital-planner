"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function GoogleButton({ label = "เข้าสู่ระบบด้วย Google", variant = "primary" }: { label?: string; variant?: "primary" | "subtle" }) {
  const signIn = () =>
    supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: CALENDAR_SCOPE,
        // offline + consent so Google returns a refresh token for background sync
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

  return (
    <button
      onClick={signIn}
      className={
        variant === "primary"
          ? "w-full rounded-xl bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-700"
          : "rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-100"
      }
    >
      {label}
    </button>
  );
}
