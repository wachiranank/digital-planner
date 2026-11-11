"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export function GoogleButton({
  label = "เข้าสู่ระบบด้วย Google",
  variant = "primary",
  next,
}: {
  label?: string;
  variant?: "primary" | "subtle";
  next?: string;
}) {
  const signIn = () => {
    if (next?.startsWith("/") && !next.startsWith("//")) {
      document.cookie = `after_login=${encodeURIComponent(next)}; path=/; max-age=600; samesite=lax; secure`;
    }
    return supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: CALENDAR_SCOPE,
        // offline + consent so Google returns a refresh token for background sync
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  return (
    <button
      onClick={signIn}
      className={
        variant === "primary"
          ? "w-full rounded-xl bg-brand-600 px-4 py-3 text-lg font-semibold text-white hover:bg-brand-700"
          : "rounded-lg bg-white px-3 py-2 text-sm font-medium ring-1 ring-stone-300 hover:bg-stone-100"
      }
    >
      {label}
    </button>
  );
}
