# Digital Planner

Planner ภาษาไทย: งานสำคัญ 3 อย่างต่อวัน, งานค้างยกไปวันถัดไปอัตโนมัติ, ทดลองฟรี 14 วัน, ปลดล็อกด้วย license key จากร้าน
Next.js (Vercel) + Supabase (โปรเจกต์เดียวกับร้าน, ตาราง `planner_*`) + Google Sign-in

## สถานะ
- [x] Phase 1 — Google sign-in, trial 14 วัน, ใส่ license key (เรียก License API ของร้าน)
- [x] Phase 2 (เริ่มต้น) — หน้า "วันนี้": งานสำคัญ 3 อย่าง, ยกงานค้าง, เสร็จ/ลบ, วันที่แบบ พ.ศ.
- [x] Phase 3 — ซิงก์ Google Calendar: ดูนัดวันนี้, กด ⏰ ลงเวลางาน → สร้าง event, เสร็จ/ลบ/ย้ายเวลา สะท้อนทั้ง 2 ฝั่ง (ต้องมี `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, เปิด Calendar API, รัน `0002_google_tokens.sql`)
- [x] Phase 4 — มุมมองสัปดาห์ (ย้ายงานข้ามวัน, ดูนัดทั้งสัปดาห์), layout 2 คอลัมน์บน iPad/คอม, PWA ติดตั้งลงหน้าจอได้ + หน้าออฟไลน์
- [x] Phase 5 — แจ้งเตือน Web Push (เตือนก่อนเริ่มงาน, สรุปเช้า 07:30, ชวนทบทวนวันอาทิตย์ 18:00) + หน้า "ทบทวน" รายสัปดาห์ (สถิติ, งานค้าง → ย้ายไปจันทร์หน้า, บันทึก + โฟกัสสัปดาห์หน้า)
- [x] Phase 6 (โค้ดพร้อม) — LINE OA: เชื่อมบัญชีด้วยรหัส 6 ตัว, แจ้งเตือนทาง LINE คู่กับ Web Push, พิมพ์ "วันนี้" ในแชทเพื่อดูงาน
  - รัน `0004_line.sql`, ตั้ง env `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_BOT_BASIC_ID`
  - Webhook URL: `https://<your-app>/api/line/webhook`
- [x] Batch 1 — งานทำซ้ำ (ทุกวัน/วันทำงาน/สัปดาห์/เดือน), โน้ต + เช็กลิสต์ + หมวดสี, ติดตามนิสัย (streak), เพิ่มงานภาษาไทย ("ประชุม พรุ่งนี้ บ่าย 2 1 ชม.") ทั้งในแอปและ LINE ("เพิ่ม ...") — รัน `0005_batch1.sql`
- [x] มุมมองรายเดือน (ปฏิทิน) + หมวดหมู่ของตัวเอง (ชื่อ + สี, หน้า ⚙️) — รัน `0006_custom_tags.sql`
- [x] Inbox + จัดการงานค้าง — หน้า 📥 Inbox (จดไว้ก่อน ยังไม่ต้องเลือกวัน, LINE "จด ..."), งานค้างจากวันก่อนมีปุ่ม ทำวันนี้ / พรุ่งนี้ / เลือกวัน / Inbox / ไม่ทำแล้ว + จัดการทั้งหมดในคลิกเดียว — รัน `0007_inbox.sql`
- [ ] Batch 2 — ไทม์ไลน์รายวัน (ลากลงช่องเวลา), เป้าหมายรายเดือน, จับเวลาโฟกัส, บันทึกประจำวัน

### ตั้งค่า Phase 5
1. รัน `supabase/migrations/0003_reminders_review.sql`
2. ตั้ง env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET` (สร้างคีย์: `npx web-push generate-vapid-keys`)
3. ตั้ง cron ใน Supabase (SQL editor) — เก็บ secret ใน Vault แล้วเรียก endpoint ทุก 5 นาที:
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
select vault.create_secret('<CRON_SECRET>', 'planner_cron_secret');
select cron.schedule('planner-reminders', '*/5 * * * *', $$
  select net.http_get(
    url := 'https://<your-app>/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'planner_cron_secret')),
    timeout_milliseconds := 30000
  );
$$);
```
iPhone/iPad: การแจ้งเตือนทำงานเมื่อติดตั้งแอปลงหน้าจอโฮมแล้ว (iOS 16.4+)

## ติดตั้ง
1. Supabase → SQL Editor → รัน `supabase/migrations/0001_planner.sql`
2. Google Cloud Console → สร้าง OAuth client (Web) → Authorized redirect URI:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Sign In / Providers → Google → ใส่ Client ID / Secret → Enable
4. Supabase → Authentication → URL Configuration → Site URL = URL ของ planner และเพิ่ม `https://<planner>/auth/callback` ใน Redirect URLs
5. Vercel → import repo → ใส่ env ตาม `.env.example` → Deploy

## ความปลอดภัย
- ผู้ใช้อ่านได้เฉพาะ profile และ task ของตัวเอง (RLS)
- `license_key` เขียนได้จาก server เท่านั้น (secret key) — ผู้ใช้ปลอม license เองไม่ได้
- การตรวจ license เรียก `STORE_URL/api/license/activate` โดยใช้ `planner:<user_id>` เป็น device id


## Self-host บน VPS
ดูโฟลเดอร์ [`selfhost/`](selfhost/README.md) — Docker image สร้างอัตโนมัติด้วย GitHub Actions ไปที่ `ghcr.io/wachiranank/digital-planner`
