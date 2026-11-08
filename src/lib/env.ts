// Settings read at *runtime* so one Docker image works on any domain.
// Vercel keeps working with the NEXT_PUBLIC_* names; self-hosted sets the plain names.
export const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
export const supabasePublishableKey = () =>
  (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
export const publicStoreUrl = () => process.env.PUBLIC_STORE_URL || process.env.NEXT_PUBLIC_STORE_URL || "";
/** This app's host without protocol, e.g. "planner.example.com". */
export const appHost = () =>
  (process.env.APP_URL ? new URL(process.env.APP_URL).host : process.env.VERCEL_PROJECT_PRODUCTION_URL) ?? "";

/** Values the browser needs, injected by the root layout as window.__ENV. */
export const browserEnv = () => ({ SUPABASE_URL: supabaseUrl(), SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey() });
