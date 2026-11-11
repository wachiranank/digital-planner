import { supabaseServer } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";

/** Every /app page: navigation (rail on laptops, floating tab bar + "+" on phones). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // tasks waiting in the Inbox (RLS limits this to the signed-in user)
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("planner_tasks")
    .select("id", { count: "exact", head: true })
    .is("day", null)
    .eq("done", false);
  return <AppShell inbox={count ?? 0}>{children}</AppShell>;
}
