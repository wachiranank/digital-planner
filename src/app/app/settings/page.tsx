import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getTags } from "@/lib/tags-server";
import { AppNav } from "../nav";
import { TagManager } from "./tag-manager";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const tags = await getTags(supabase);

  return (
    <main className="mx-auto max-w-2xl px-5 py-6 md:py-10">
      <AppNav active="settings" />
      <h1 className="mt-4 text-2xl font-bold">ตั้งค่าหมวดหมู่</h1>
      <p className="mt-1 text-sm text-stone-500">สร้างหมวดของคุณเองพร้อมสี ใช้จัดกลุ่มงานในทุกหน้า</p>
      <div className="mt-6">
        <TagManager tags={tags} />
      </div>
    </main>
  );
}
