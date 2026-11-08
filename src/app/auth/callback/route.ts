import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabase/server";
import { saveRefreshToken } from "@/lib/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.exchangeCodeForSession(code);
    // Google only returns a refresh token here (with access_type=offline + prompt=consent);
    // Supabase does not keep it, so we store it for Calendar sync.
    const refresh = data.session?.provider_refresh_token;
    if (data.user && refresh) await saveRefreshToken(data.user.id, refresh);
  }
  const jar = await cookies();
  const next = decodeURIComponent(jar.get("after_login")?.value ?? "");
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  const res = NextResponse.redirect(new URL(dest, url.origin));
  res.cookies.delete("after_login");
  return res;
}
