import { createBrowserClient } from "@supabase/ssr";

declare global {
  interface Window {
    __ENV?: { SUPABASE_URL: string; SUPABASE_PUBLISHABLE_KEY: string };
  }
}

// Runtime values injected by the root layout (self-hosted), falling back to build-time values (Vercel)
export const supabaseBrowser = () =>
  createBrowserClient(
    window.__ENV?.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    window.__ENV?.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
