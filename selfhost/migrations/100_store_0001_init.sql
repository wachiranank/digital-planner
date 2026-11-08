-- Digital Product Store — initial schema
-- Run in Supabase SQL Editor (or `supabase db push`).

create extension if not exists pgcrypto;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text unique not null,
  currency text not null default 'thb',
  vat_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  price_satang integer not null check (price_satang > 0),
  type text not null default 'license' check (type in ('file','license','file_license')),
  file_key text,                      -- object key in R2 (null for license-only products)
  max_downloads integer not null default 5,
  max_activations integer not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  name text,
  line_user_id text,
  pdpa_consent_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  unique (store_id, email)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  customer_id uuid not null references public.customers(id),
  stripe_session_id text unique,
  stripe_payment_intent text,
  amount_satang integer not null,
  status text not null default 'pending'
    check (status in ('pending','paid','failed','refunded')),
  email_status text not null default 'none'
    check (email_status in ('none','sent','failed')),
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  price_satang integer not null
);

create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  key text unique not null,
  status text not null default 'active' check (status in ('active','revoked')),
  max_activations integer not null default 3,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now(),
  unique (license_id, device_id)
);

create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  token_hash text unique not null,   -- sha256 of the token sent by email
  expires_at timestamptz not null,
  count integer not null default 0,
  last_ip text,
  created_at timestamptz not null default now()
);

create table public.webhook_events (
  stripe_event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- Row Level Security ---------------------------------------------------------
alter table public.stores              enable row level security;
alter table public.products            enable row level security;
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.licenses            enable row level security;
alter table public.license_activations enable row level security;
alter table public.downloads           enable row level security;
alter table public.webhook_events      enable row level security;

-- Store owners manage their own store
create policy "owner reads store" on public.stores
  for select using (owner_id = auth.uid());

-- Public can read active products (file_key is never selected by the client:
-- the storefront reads products through the server with the service role)
create policy "public reads active products" on public.products
  for select using (is_active = true);

create policy "owner manages products" on public.products
  for all using (store_id in (select id from public.stores where owner_id = auth.uid()));

create policy "owner reads orders" on public.orders
  for select using (store_id in (select id from public.stores where owner_id = auth.uid()));

create policy "owner reads customers" on public.customers
  for select using (store_id in (select id from public.stores where owner_id = auth.uid()));

-- orders / licenses / downloads / webhook_events are written only by the
-- service role from server routes (service role bypasses RLS).

-- Seed: one store + the first product (Digital Planner, Early Bird 390 THB)
insert into public.stores (name, slug) values ('My Store', 'main');
insert into public.products (store_id, name, slug, description, price_satang, type)
select id, 'Digital Planner (Early Bird)', 'planner-early-bird',
       'Planner ซิงก์ Google Calendar ใช้ได้ตลอดชีพ จ่ายครั้งเดียว', 39000, 'license'
from public.stores where slug = 'main';
