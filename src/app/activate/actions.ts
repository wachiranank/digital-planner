"use server";

import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

export async function activateLicense(form: FormData) {
  const key = String(form.get("key") ?? "").trim().toUpperCase();
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  let result: { valid?: boolean; error?: string };
  try {
    const res = await fetch(`${process.env.STORE_URL}/api/license/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // one activation per planner account
      body: JSON.stringify({ key, device_id: `planner:${user.id}` }),
      cache: "no-store",
    });
    result = await res.json();
  } catch {
    redirect("/activate?error=network");
  }

  if (!result.valid) redirect(`/activate?error=${result.error === "activation limit reached" ? "limit" : "invalid"}`);

  await supabaseAdmin()
    .from("planner_profiles")
    .upsert({ user_id: user.id, license_key: key, licensed_at: new Date().toISOString() });

  redirect("/app");
}
