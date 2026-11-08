# Self-host: Store + Planner บน VPS เครื่องเดียว

ชุดนี้รันทุกอย่างบนเซิร์ฟเวอร์ของคุณเอง: ร้านค้า (Store), Planner, ฐานข้อมูล Postgres, ระบบล็อกอิน (Supabase Auth), API, HTTPS อัตโนมัติ, แจ้งเตือนทุก 5 นาที และ backup รายวัน

```
                    ┌──────────── Caddy (HTTPS อัตโนมัติ) ────────────┐
 app.โดเมน  ──────► │ planner:3000                                      │
 shop.โดเมน ──────► │ store:3000                                        │
 api.โดเมน  ──────► │ /auth/v1 → auth (GoTrue)   /rest/v1 → rest (PostgREST) │
                    └───────────────────────────────────────────────────┘
                     db (Postgres) · migrate (ครั้งเดียวต่อการอัปเดต) · cron (ทุก 5 นาที)
```

ภายนอกที่ยังต้องใช้: Google OAuth/Calendar, Stripe, LINE (ไม่บังคับ), Resend (ไม่บังคับ)

---

## ติดตั้งบน Hostinger VPS

### 0. สเปกที่แนะนำ
- KVM 2 ขึ้นไป (2 vCPU / 8 GB RAM) · Ubuntu 24.04 · เปิดพอร์ต 80 และ 443
- (สแต็กนี้ใช้ RAM จริงประมาณ 1.5–2 GB)

### 1. ตั้ง DNS (hPanel → Domains → DNS / Nameservers)
เพิ่ม **A record** 3 ตัว ชี้ไปที่ IP ของ VPS:

| Name | Type | Value |
|------|------|-------|
| `app`  | A | IP ของ VPS |
| `shop` | A | IP ของ VPS |
| `api`  | A | IP ของ VPS |

รอ 5–30 นาทีให้ DNS อัปเดต (เช็กด้วย `ping app.โดเมน`)

### 2. เตรียม token สำหรับดึง Docker image
GitHub → Settings → Developer settings → Personal access tokens (classic) → **Generate** → เลือก `read:packages` → คัดลอก token ไว้

### 3. ติดตั้ง
SSH เข้า VPS (hPanel → VPS → SSH access) แล้วรัน:

```bash
git clone https://github.com/wachiranank/digital-planner.git
cd digital-planner/selfhost
./install.sh
```

สคริปต์จะถาม: โดเมน, อีเมลแอดมิน, Google Client ID/Secret (ข้ามไปก่อนได้) แล้ว
- สร้างรหัสผ่าน/คีย์ทั้งหมดให้อัตโนมัติ ลงไฟล์ `.env` (ห้ามแชร์ไฟล์นี้)
- ขอให้ล็อกอิน `ghcr.io` (ใส่ GitHub username + token จากข้อ 2)
- เปิดระบบ + ตั้ง backup ทุกวัน 03:00

### 4. ตั้งค่าบริการภายนอกให้ชี้มาที่โดเมนใหม่

**Google Cloud Console → APIs & Services → Credentials → OAuth client**
- Authorized JavaScript origins: `https://app.โดเมน`
- Authorized redirect URIs: `https://api.โดเมน/auth/v1/callback`
- OAuth consent screen → App domain / Privacy policy: `https://shop.โดเมน/privacy`, Terms: `https://shop.โดเมน/terms`
- ใส่ Client ID/Secret ใน `.env` (ถ้ายังไม่ได้ใส่)

**Stripe → Developers → Webhooks → Add endpoint**
- URL: `https://shop.โดเมน/api/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`
- ใส่ `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` ใน `.env`

**LINE Developers (ถ้าใช้) → Messaging API → Webhook URL**
- `https://app.โดเมน/api/line/webhook` → Verify
- ใส่ `PLANNER_LINE_CHANNEL_SECRET`, `PLANNER_LINE_CHANNEL_ACCESS_TOKEN`, `PLANNER_LINE_BOT_BASIC_ID` ใน `.env`

แก้ `.env` แล้วต้องรัน:
```bash
docker compose up -d
```

### 5. ทดสอบ
1. เปิด `https://app.โดเมน` → ล็อกอิน Google → เพิ่มงาน
2. เปิด `https://shop.โดเมน` → ซื้อด้วยบัตรทดสอบ `4242 4242 4242 4242` → ได้ license key ทันที
3. ดูสถานะ: `docker compose ps` · ดู log: `docker compose logs -f planner`

---

## งานประจำ

| ทำอะไร | คำสั่ง |
|---|---|
| อัปเดตเวอร์ชันใหม่ (backup อัตโนมัติก่อน) | `./update.sh` |
| backup เอง | `./backup.sh` → ไฟล์อยู่ใน `backups/` (เก็บ 14 วัน) |
| กู้คืน | `docker compose exec -T db pg_restore -U postgres -d postgres --clean --if-exists < backups/<ไฟล์>.dump` |
| เข้าฐานข้อมูล | `docker compose exec db psql -U postgres` |
| รีสตาร์ต | `docker compose restart` |

**สำคัญ:** คัดลอกโฟลเดอร์ `backups/` ออกไปเก็บนอกเซิร์ฟเวอร์ด้วย (เช่น `rclone` ไป Cloudflare R2 หรือ Google Drive) และเก็บไฟล์ `.env` สำรองไว้ที่ปลอดภัย — ถ้า `.env` หาย จะเปิดข้อมูลเดิมไม่ได้

## ย้ายข้อมูลจาก Supabase cloud (ถ้าต้องการ)
ยังไม่ได้เปิดขายจริง ข้อมูลมีแค่ทดสอบ → แนะนำเริ่มใหม่บน VPS เลย
ถ้าต้องการย้าย: `pg_dump --data-only` เฉพาะตาราง `public.*` และ `auth.users`/`auth.identities` จาก cloud แล้ว restore — ติดต่อผู้พัฒนาก่อนทำ

## เพิ่ม migration ใหม่
วางไฟล์ SQL ใน `migrations/` ตั้งชื่อเรียงลำดับ (`1xx_store_*`, `2xx_planner_*`) — `migrate` จะรันไฟล์ใหม่ให้อัตโนมัติตอน `docker compose up -d` / `./update.sh` (ไฟล์ที่รันแล้วจะไม่ถูกรันซ้ำ)
