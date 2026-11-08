import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "../env";

/** Supabase client acting as the signed-in user (RLS applies). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl(),
    supabasePublishableKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component: middleware refreshes the session instead
          }
        },
      },
    },
  );
}

/** Admin client (secret key) — only for writes users must not make themselves, e.g. licenses. */
export const supabaseAdmin = () =>
  createAdmin(supabaseUrl(), process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
