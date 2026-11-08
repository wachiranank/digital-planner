import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { GoogleButton } from "./google-button";

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/app");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="text-3xl font-bold leading-tight">
        วางแผนวันละ 1 นาที
        <br />
        <span className="text-emerald-700">ไม่ต้องจดซ้ำสองที่</span>
      </h1>
      <p className="mt-3 text-stone-600">
        งานสำคัญ 3 อย่างต่อวัน งานค้างยกไปให้อัตโนมัติ ใช้ได้ทั้ง iPad มือถือ และคอม
      </p>
      <div className="mt-8">
        <GoogleButton />
      </div>
      <p className="mt-3 text-center text-sm text-stone-500">ทดลองใช้ฟรี 14 วัน ไม่ต้องใส่บัตร</p>
    </main>
  );
}
