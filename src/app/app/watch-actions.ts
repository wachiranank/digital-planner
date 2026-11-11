"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { MAX_TOKENS, newToken } from "@/lib/api-token";

async function me() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return user;
}

/** Creates a personal token for Siri Shortcuts. The full token is returned only this once. */
export async function createApiToken(name: string): Promise<{ token?: string; error?: string }> {
  const user = await me();
  const admin = supabaseAdmin();
  const { count } = await admin
    .from("planner_api_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_TOKENS) return { error: `มี token ได้สูงสุด ${MAX_TOKENS} อัน — ยกเลิกอันที่ไม่ใช้ก่อน` };
  const t = newToken();
  const { error } = await admin.from("planner_api_tokens").insert({
    user_id: user.id,
    name: name.trim().slice(0, 60) || "Siri Shortcuts",
    token_hash: t.hash,
    prefix: t.prefix,
  });
  if (error) return { error: "สร้าง token ไม่สำเร็จ ลองใหม่อีกครั้ง" };
  revalidatePath("/app/settings");
  return { token: t.token };
}

export async function revokeApiToken(id: string) {
  const user = await me();
  await supabaseAdmin().from("planner_api_tokens").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/app/settings");
}
