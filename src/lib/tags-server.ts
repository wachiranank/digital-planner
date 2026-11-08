import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUILTIN, isBuiltinTag, isColor, type TagDef } from "./tags";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Built-in categories followed by the user's own (RLS limits rows to the signed-in user). */
export async function getTags(supabase: SupabaseClient): Promise<TagDef[]> {
  const { data } = await supabase.from("planner_tags").select("id, name, color").order("created_at");
  return [
    ...BUILTIN,
    ...(data ?? []).map((t) => ({ key: t.id as string, label: t.name as string, color: isColor(t.color) ? t.color : "slate", custom: true })),
  ];
}

/** A tag value the user may set: a built-in key or one of their own category ids. */
export async function validTag(supabase: SupabaseClient, tag: unknown): Promise<string | null> {
  if (isBuiltinTag(tag)) return tag as string;
  if (typeof tag !== "string" || !UUID.test(tag)) return null;
  const { data } = await supabase.from("planner_tags").select("id").eq("id", tag).maybeSingle();
  return data ? tag : null;
}
