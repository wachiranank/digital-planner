"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

export function GoogleButton() {
  const signIn = () =>
    supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

  return (
    <button
      onClick={signIn}
      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-lg font-semibold text-white hover:bg-emerald-700"
    >
      เข้าสู่ระบบด้วย Google
    </button>
  );
}
