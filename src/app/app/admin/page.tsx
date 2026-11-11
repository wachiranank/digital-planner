import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { currentAdmin } from "@/lib/admin";
import { GiftForm } from "./gift-form";
import { revokeGift } from "./actions";
import { RevokeButton } from "./revoke-button";

export const dynamic = "force-dynamic";

type GiftRow = {
  key: string;
  status: string;
  created_at: string;
  order_items: { orders: { amount_satang: number; customers: { email: string } } };
};

export default async function Admin() {
  if (!(await currentAdmin())) notFound();

  const db = supabaseAdmin();
  const [{ data: products }, { data: gifts }, { data: profiles }] = await Promise.all([
    db.from("products").select("id, name").eq("is_active", true).order("created_at"),
    db
      .from("licenses")
      .select("key, status, created_at, order_items!inner(orders!inner(amount_satang, customers!inner(email)))")
      .eq("order_items.orders.amount_satang", 0)
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("planner_profiles").select("license_key").not("license_key", "is", null),
  ]);
  const used = new Set((profiles ?? []).map((p) => p.license_key));
  const rows = (gifts ?? []) as unknown as GiftRow[];
  const appUrl = process.env.APP_URL || "";

  return (
    <main className="mx-auto max-w-2xl px-5 pb-10 pt-6 lg:px-10 lg:pt-8">
      <h1 className="text-[32px] font-bold leading-tight tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-stone-500">
        สร้าง license ฟรีให้เพื่อน — บันทึกเป็นออร์เดอร์ 0 บาท ไม่ปนกับยอดขาย Stripe
      </p>

      <section className="mt-6">
        <GiftForm products={products ?? []} appUrl={appUrl} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold">Key ฟรีที่แจกไป ({rows.length})</h2>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">ยังไม่มี</p>
        ) : (
          <ul className="mt-3 divide-y divide-stone-100 rounded-xl bg-white text-sm ring-1 ring-stone-200">
            {rows.map((r) => (
              <li key={r.key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.order_items.orders.customers.email}</div>
                  <div className="font-mono text-xs text-stone-500">
                    {r.key} · {new Date(r.created_at).toLocaleDateString("th-TH")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "revoked" ? (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">ยกเลิกแล้ว</span>
                  ) : (
                    <>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          used.has(r.key) ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {used.has(r.key) ? "ใช้งานแล้ว" : "ยังไม่ใช้"}
                      </span>
                      <form action={revokeGift}>
                        <input type="hidden" name="key" value={r.key} />
                        <RevokeButton email={r.order_items.orders.customers.email} />
                      </form>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
