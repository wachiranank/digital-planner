"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { currentAdmin, newLicenseKey } from "@/lib/admin";

export type GiftResult = { ok: true; key: string; email: string } | { ok: false; error: string } | null;

/** Free license: a 0-baht "paid" order, so it never mixes with Stripe sales. */
export async function createGift(_prev: GiftResult, form: FormData): Promise<GiftResult> {
  if (!(await currentAdmin())) return { ok: false, error: "ไม่มีสิทธิ์" };

  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "อีเมลไม่ถูกต้อง" };
  const productId = String(form.get("product") ?? "");

  const db = supabaseAdmin();
  const { data: product } = await db
    .from("products")
    .select("id, store_id, max_activations")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return { ok: false, error: "ไม่พบสินค้า" };

  const { data: customer, error: cErr } = await db
    .from("customers")
    .upsert({ store_id: product.store_id, email }, { onConflict: "store_id,email" })
    .select("id")
    .single();
  if (cErr) return { ok: false, error: cErr.message };

  const { data: order, error: oErr } = await db
    .from("orders")
    .insert({
      store_id: product.store_id,
      customer_id: customer.id,
      amount_satang: 0,
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (oErr) return { ok: false, error: oErr.message };

  const { data: item, error: iErr } = await db
    .from("order_items")
    .insert({ order_id: order.id, product_id: product.id, price_satang: 0 })
    .select("id")
    .single();
  if (iErr) return { ok: false, error: iErr.message };

  const key = newLicenseKey();
  const { error: lErr } = await db
    .from("licenses")
    .insert({ order_item_id: item.id, key, max_activations: product.max_activations });
  if (lErr) return { ok: false, error: lErr.message };

  revalidatePath("/app/admin");
  return { ok: true, key, email };
}

export async function revokeGift(form: FormData) {
  if (!(await currentAdmin())) return;
  const key = String(form.get("key") ?? "");
  if (!/^DPS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) return;
  const db = supabaseAdmin();
  await db
    .from("licenses")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("key", key)
    .eq("status", "active");
  // the account that used it goes back to trial/expired
  await db.from("planner_profiles").update({ license_key: null, licensed_at: null }).eq("license_key", key);
  revalidatePath("/app/admin");
}
