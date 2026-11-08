# Digital Planner

Planner ภาษาไทย: งานสำคัญ 3 อย่างต่อวัน, งานค้างยกไปวันถัดไปอัตโนมัติ, ทดลองฟรี 14 วัน, ปลดล็อกด้วย license key จากร้าน
Next.js (Vercel) + Supabase (โปรเจกต์เดียวกับร้าน, ตาราง `planner_*`) + Google Sign-in

## สถานะ
- [x] Phase 1 — Google sign-in, trial 14 วัน, ใส่ license key (เรียก License API ของร้าน)
- [x] Phase 2 (เริ่มต้น) — หน้า "วันนี้": งานสำคัญ 3 อย่าง, ยกงานค้าง, เสร็จ/ลบ, วันที่แบบ พ.ศ.
- [x] Phase 3 — ซิงก์ Google Calendar: ดูนัดวันนี้, กด ⏰ ลงเวลางาน → สร้าง event, เสร็จ/ลบ/ย้ายเวลา สะท้อนทั้ง 2 ฝั่ง (ต้องมี `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, เปิด Calendar API, รัน `0002_google_tokens.sql`)
- [x] Phase 4 — มุมมองสัปดาห์ (ย้ายงานข้ามวัน, ดูนัดทั้งสัปดาห์), layout 2 คอลัมน์บน iPad/คอม, PWA ติดตั้งลงหน้าจอได้ + หน้าออฟไลน์
- [ ] Phase 5 — แจ้งเตือน LINE + weekly review

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
