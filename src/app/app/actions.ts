"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { todayBangkok } from "@/lib/access";

async function db() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return supabase;
}

export async function addTask(form: FormData) {
  const title = String(form.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await db();
  await supabase.from("planner_tasks").insert({ title, day: todayBangkok() });
  revalidatePath("/app");
}

export async function toggleDone(id: string, done: boolean) {
  const supabase = await db();
  await supabase
    .from("planner_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/app");
}

export async function togglePriority(id: string, isPriority: boolean) {
  const supabase = await db();
  if (isPriority) {
    // keep the "top 3" rule
    const { count } = await supabase
      .from("planner_tasks")
      .select("id", { count: "exact", head: true })
      .eq("day", todayBangkok())
      .eq("is_priority", true)
      .eq("done", false);
    if ((count ?? 0) >= 3) return;
  }
  await supabase.from("planner_tasks").update({ is_priority: isPriority }).eq("id", id);
  revalidatePath("/app");
}

export async function deleteTask(id: string) {
  const supabase = await db();
  await supabase.from("planner_tasks").delete().eq("id", id);
  revalidatePath("/app");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
