import { NextResponse } from "next/server";
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
  return NextResponse.redirect(new URL("/app", url.origin));
}
