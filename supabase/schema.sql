-- ════════════════════════════════════════════════════════════════════
-- Revenue Credit AI — database schema
-- Run this in the Supabase SQL Editor (idempotent — safe to re-run).
-- Covers: profiles, orders, credit_reports, dispute_letters,
-- private storage buckets, and RLS so clients only see their own data.
-- ════════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ════════════════════════════════════════════════════════════════════
-- TABLES
-- ════════════════════════════════════════════════════════════════════

-- profiles ───────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  role        text not null default 'client' check (role in ('client', 'admin')),
  created_at  timestamptz not null default now()
);

-- orders ─────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles (id) on delete cascade,
  plan_id                   text not null check (plan_id in ('diy', 'dfy')),
  status                    text not null default 'pending'
                              check (status in ('pending', 'active', 'completed', 'canceled')),
  amount_cents              integer,
  interval                  text check (interval in ('one_time', 'per_round')),
  stripe_checkout_session_id text,
  stripe_customer_id        text,
  stripe_subscription_id    text,
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists orders_user_id_idx on public.orders (user_id);

-- credit_reports (client uploads) ────────────────────────────────────
create table if not exists public.credit_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  file_path   text not null,          -- path inside the 'credit-reports' bucket
  file_name   text not null,
  file_size   integer,
  status      text not null default 'uploaded' check (status in ('uploaded', 'reviewed')),
  uploaded_at timestamptz not null default now()
);
create index if not exists credit_reports_user_id_idx on public.credit_reports (user_id);

-- dispute_letters (admin uploads back to client) ─────────────────────
create table if not exists public.dispute_letters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  order_id    uuid references public.orders (id) on delete set null,
  file_path   text not null,          -- path inside the 'dispute-letters' bucket
  file_name   text not null,
  round       integer not null default 1,
  notes       text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists dispute_letters_user_id_idx on public.dispute_letters (user_id);

-- ── Auto-create a profile row when a new auth user signs up ─────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Helper: is the current user an admin? ───────────────────────────
-- Defined after the tables exist. SECURITY DEFINER so policies can check
-- the role without triggering recursive RLS on the profiles table.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles        enable row level security;
alter table public.orders          enable row level security;
alter table public.credit_reports  enable row level security;
alter table public.dispute_letters enable row level security;

-- profiles ───────────────────────────────────────────────────────────
drop policy if exists "profiles: read own or admin"  on public.profiles;
drop policy if exists "profiles: update own or admin" on public.profiles;
drop policy if exists "profiles: insert own"          on public.profiles;

create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());
create policy "profiles: insert own" on public.profiles
  for insert with check (id = auth.uid());

-- orders ─────────────────────────────────────────────────────────────
-- Writes happen server-side via the service-role key (Stripe webhook),
-- which bypasses RLS. Clients only ever read their own orders.
drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

-- credit_reports ─────────────────────────────────────────────────────
drop policy if exists "credit_reports: read own or admin"  on public.credit_reports;
drop policy if exists "credit_reports: insert own"          on public.credit_reports;
drop policy if exists "credit_reports: update own or admin" on public.credit_reports;

create policy "credit_reports: read own or admin" on public.credit_reports
  for select using (user_id = auth.uid() or public.is_admin());
create policy "credit_reports: insert own" on public.credit_reports
  for insert with check (user_id = auth.uid());
create policy "credit_reports: update own or admin" on public.credit_reports
  for update using (user_id = auth.uid() or public.is_admin());

-- dispute_letters ────────────────────────────────────────────────────
-- Only admins create/edit; clients read the letters addressed to them.
drop policy if exists "dispute_letters: read own or admin" on public.dispute_letters;
drop policy if exists "dispute_letters: admin write"        on public.dispute_letters;

create policy "dispute_letters: read own or admin" on public.dispute_letters
  for select using (user_id = auth.uid() or public.is_admin());
create policy "dispute_letters: admin write" on public.dispute_letters
  for all using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════
-- STORAGE  (private buckets + path-scoped RLS)
-- Path convention: <user_id>/<filename>  → first folder = owner uid
-- ════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('credit-reports', 'credit-reports', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('dispute-letters', 'dispute-letters', false)
on conflict (id) do nothing;

-- credit-reports: client manages files under their own uid folder; admin reads all
drop policy if exists "credit-reports: client read own"   on storage.objects;
drop policy if exists "credit-reports: client upload own"  on storage.objects;
drop policy if exists "credit-reports: admin read"         on storage.objects;

create policy "credit-reports: client read own" on storage.objects
  for select using (
    bucket_id = 'credit-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "credit-reports: client upload own" on storage.objects
  for insert with check (
    bucket_id = 'credit-reports'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "credit-reports: admin read" on storage.objects
  for select using (bucket_id = 'credit-reports' and public.is_admin());

-- dispute-letters: admin uploads; client reads files under their own uid folder
drop policy if exists "dispute-letters: client read own" on storage.objects;
drop policy if exists "dispute-letters: admin write"      on storage.objects;

create policy "dispute-letters: client read own" on storage.objects
  for select using (
    bucket_id = 'dispute-letters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "dispute-letters: admin write" on storage.objects
  for all using (bucket_id = 'dispute-letters' and public.is_admin())
  with check (bucket_id = 'dispute-letters' and public.is_admin());

-- ════════════════════════════════════════════════════════════════════
-- POST-SETUP (manual):
--   Promote the admin account after Joseph signs up once:
--     update public.profiles set role = 'admin' where email = 'JOSEPH_EMAIL';
-- ════════════════════════════════════════════════════════════════════
