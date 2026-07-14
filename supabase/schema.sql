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
  mailing_address text,
  role        text not null default 'client' check (role in ('client', 'admin')),
  created_at  timestamptz not null default now()
);
-- Backfill for existing installs (no-op if the column already exists).
alter table public.profiles
  add column if not exists mailing_address text;

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

-- letter_drafts (AI-generated dispute-letter text, admin-reviewed) ────
-- Generated from an uploaded credit report by the AI step, then a human
-- admin edits/approves before the client can see it. NOTHING is ever
-- auto-sent — a draft is invisible to the client until status='approved'.
create table if not exists public.letter_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  report_id   uuid references public.credit_reports (id) on delete set null,
  bureau      text not null,           -- Equifax | Experian | TransUnion
  subject     text,
  body        text not null,           -- the letter text itself
  round       integer not null default 1,
  model       text,                    -- which AI model produced it
  status      text not null default 'draft'
                check (status in ('draft', 'approved', 'rejected')),
  created_by  uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists letter_drafts_user_id_idx on public.letter_drafts (user_id);

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
alter table public.letter_drafts   enable row level security;

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

-- letter_drafts ──────────────────────────────────────────────────────
-- Admins create/edit/approve. Clients can ONLY read drafts that have been
-- approved by a human — a 'draft' or 'rejected' row is invisible to them.
drop policy if exists "letter_drafts: read own approved or admin" on public.letter_drafts;
drop policy if exists "letter_drafts: admin write"               on public.letter_drafts;

create policy "letter_drafts: read own approved or admin" on public.letter_drafts
  for select using (
    public.is_admin()
    or (user_id = auth.uid() and status = 'approved')
  );
create policy "letter_drafts: admin write" on public.letter_drafts
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
-- LIFECYCLE + COMPLIANCE  (dispute_items, score_history, agreements)
-- See migrations/2026-06-11-lifecycle-and-compliance.sql for full notes.
-- ════════════════════════════════════════════════════════════════════

-- dispute_items: item-level dispute tracking. Round/journey state is derived
-- from these rows (no separate rounds table). Created when the AI drafts a
-- round; walked through its lifecycle by the admin as bureaus respond.
create table if not exists public.dispute_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  report_id     uuid references public.credit_reports (id) on delete set null,
  draft_id      uuid references public.letter_drafts (id) on delete set null,
  bureau        text not null,
  creditor      text not null,
  account_mask  text,
  item_type     text,
  reason        text,
  round         integer not null default 1,
  status        text not null default 'pending'
                  check (status in ('pending','sent','deleted','verified','updated','needs_followup')),
  sent_at         timestamptz,
  response_due_at timestamptz,
  resolved_at     timestamptz,
  outcome_note    text,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index if not exists dispute_items_user_id_idx on public.dispute_items (user_id);
create index if not exists dispute_items_draft_id_idx on public.dispute_items (draft_id);

-- score_history: a client's score per bureau over time (the progress chart).
create table if not exists public.score_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  bureau      text not null default 'Merged'
                check (bureau in ('Equifax','Experian','TransUnion','Merged')),
  score       integer not null check (score between 300 and 850),
  source      text not null default 'manual'
                check (source in ('manual','smartcredit','import')),
  recorded_at date not null default current_date,
  note        text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists score_history_user_id_idx on public.score_history (user_id, recorded_at);

-- agreements: CROA service agreement + disclosure acceptance, with a
-- 3-business-day right-to-cancel window.
create table if not exists public.agreements (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  kind                  text not null check (kind in ('service_agreement','croa_disclosure')),
  version               text not null,
  full_name             text,
  accepted_at           timestamptz not null default now(),
  cancellation_deadline timestamptz,
  canceled_at           timestamptz,
  ip                    text,
  created_at            timestamptz not null default now()
);
create index if not exists agreements_user_id_idx on public.agreements (user_id);

alter table public.dispute_items enable row level security;
alter table public.score_history enable row level security;
alter table public.agreements    enable row level security;

drop policy if exists "dispute_items: read own or admin" on public.dispute_items;
drop policy if exists "dispute_items: admin write"        on public.dispute_items;
create policy "dispute_items: read own or admin" on public.dispute_items
  for select using (user_id = auth.uid() or public.is_admin());
create policy "dispute_items: admin write" on public.dispute_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "score_history: read own or admin" on public.score_history;
drop policy if exists "score_history: insert own"        on public.score_history;
drop policy if exists "score_history: admin write"       on public.score_history;
create policy "score_history: read own or admin" on public.score_history
  for select using (user_id = auth.uid() or public.is_admin());
create policy "score_history: insert own" on public.score_history
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "score_history: admin write" on public.score_history
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "agreements: read own or admin"   on public.agreements;
drop policy if exists "agreements: insert own"          on public.agreements;
drop policy if exists "agreements: update own or admin" on public.agreements;
create policy "agreements: read own or admin" on public.agreements
  for select using (user_id = auth.uid() or public.is_admin());
create policy "agreements: insert own" on public.agreements
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "agreements: update own or admin" on public.agreements
  for update using (user_id = auth.uid() or public.is_admin());

-- ════════════════════════════════════════════════════════════════════
-- IDENTITY VERIFICATION DOCUMENTS
-- See migrations/2026-06-16-verification-documents.sql for full notes.
-- Clients upload photo ID + proof of address + proof of SSN; a human admin
-- manually approves or rejects each one. Mirrors the credit_reports model.
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.verification_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  category    text not null
                check (category in ('photo_id', 'proof_of_address', 'proof_of_ssn')),
  doc_type    text,
  file_path   text not null,          -- path inside the 'verification-documents' bucket
  file_name   text not null,
  file_size   integer,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);
create index if not exists verification_documents_user_id_idx
  on public.verification_documents (user_id);

alter table public.verification_documents enable row level security;

drop policy if exists "verification_documents: read own or admin"  on public.verification_documents;
drop policy if exists "verification_documents: insert own"          on public.verification_documents;
drop policy if exists "verification_documents: update own or admin" on public.verification_documents;

create policy "verification_documents: read own or admin" on public.verification_documents
  for select using (user_id = auth.uid() or public.is_admin());
create policy "verification_documents: insert own" on public.verification_documents
  for insert with check (user_id = auth.uid());
create policy "verification_documents: update own or admin" on public.verification_documents
  for update using (user_id = auth.uid() or public.is_admin());

-- verification-documents bucket (private, path-scoped like credit-reports)
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

drop policy if exists "verification-documents: client read own"   on storage.objects;
drop policy if exists "verification-documents: client upload own"  on storage.objects;
drop policy if exists "verification-documents: admin read"         on storage.objects;

create policy "verification-documents: client read own" on storage.objects
  for select using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "verification-documents: client upload own" on storage.objects
  for insert with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "verification-documents: admin read" on storage.objects
  for select using (bucket_id = 'verification-documents' and public.is_admin());

-- ════════════════════════════════════════════════════════════════════
-- POST-SETUP (manual):
--   Promote the admin account after Joseph signs up once:
--     update public.profiles set role = 'admin' where email = 'JOSEPH_EMAIL';
-- ════════════════════════════════════════════════════════════════════
