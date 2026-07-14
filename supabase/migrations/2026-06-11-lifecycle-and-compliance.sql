-- ════════════════════════════════════════════════════════════════════
-- Revenue Credit AI — lifecycle + compliance migration
-- Run in the Supabase SQL Editor (idempotent — safe to re-run).
--
-- Adds three pillars on top of the existing schema:
--   1. dispute_items   — item-level dispute tracking (the spine). Round and
--                        journey state is DERIVED from these rows, so there is
--                        no separate "rounds" table to drift out of sync.
--   2. score_history   — a client's score per bureau over time (the progress
--                        chart). Clients self-report from their SmartCredit
--                        pulls; admins can also log scores.
--   3. agreements      — CROA service agreement + required disclosure
--                        acceptance, with a 3-business-day cancellation window.
--
-- All three are additive. The app reads them with `data ?? []` fallbacks, so
-- production keeps working before this migration is applied.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── dispute_items ───────────────────────────────────────────────────
-- One row per disputed tradeline/item. Created automatically when the AI
-- drafts a round (linked to the letter_drafts row + report), then walked
-- through its lifecycle by the admin as bureaus respond.
--   status flow:
--     pending        → drafted, letter not yet mailed
--     sent           → letter mailed; 30-day bureau clock running
--     deleted        → bureau removed the item (a win)
--     verified       → bureau verified it stays (candidate for next round)
--     updated        → corrected but not deleted
--     needs_followup → rolled into a new round
create table if not exists public.dispute_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  report_id     uuid references public.credit_reports (id) on delete set null,
  draft_id      uuid references public.letter_drafts (id) on delete set null,
  bureau        text not null,
  creditor      text not null,
  account_mask  text,
  item_type     text,                      -- collection | charge_off | late_payment | inquiry | balance | duplicate | other
  reason        text,
  round         integer not null default 1,
  status        text not null default 'pending'
                  check (status in ('pending','sent','deleted','verified','updated','needs_followup')),
  sent_at         timestamptz,
  response_due_at timestamptz,             -- sent_at + 30 days (the FCRA §611 clock)
  resolved_at     timestamptz,
  outcome_note    text,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index if not exists dispute_items_user_id_idx on public.dispute_items (user_id);
create index if not exists dispute_items_draft_id_idx on public.dispute_items (draft_id);

-- ── score_history ───────────────────────────────────────────────────
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

-- ── agreements ──────────────────────────────────────────────────────
-- CROA requires a written contract + the federally-specified disclosure,
-- accepted BEFORE any service is performed, with a 3-business-day right to
-- cancel. We store each acceptance with a typed signature + the cancel
-- deadline so the right-to-cancel can be honored and audited.
create table if not exists public.agreements (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles (id) on delete cascade,
  kind                  text not null check (kind in ('service_agreement','croa_disclosure')),
  version               text not null,
  full_name             text,             -- typed signature
  accepted_at           timestamptz not null default now(),
  cancellation_deadline timestamptz,      -- accepted_at + 3 business days
  canceled_at           timestamptz,
  ip                    text,
  created_at            timestamptz not null default now()
);
create index if not exists agreements_user_id_idx on public.agreements (user_id);

-- ════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════
alter table public.dispute_items enable row level security;
alter table public.score_history enable row level security;
alter table public.agreements    enable row level security;

-- dispute_items: clients read their own; only admins write (lifecycle is
-- managed by the admin as bureau responses come in).
drop policy if exists "dispute_items: read own or admin" on public.dispute_items;
drop policy if exists "dispute_items: admin write"        on public.dispute_items;
create policy "dispute_items: read own or admin" on public.dispute_items
  for select using (user_id = auth.uid() or public.is_admin());
create policy "dispute_items: admin write" on public.dispute_items
  for all using (public.is_admin()) with check (public.is_admin());

-- score_history: clients read + self-report their own; admins do anything.
drop policy if exists "score_history: read own or admin" on public.score_history;
drop policy if exists "score_history: insert own"        on public.score_history;
drop policy if exists "score_history: admin write"       on public.score_history;
create policy "score_history: read own or admin" on public.score_history
  for select using (user_id = auth.uid() or public.is_admin());
create policy "score_history: insert own" on public.score_history
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "score_history: admin write" on public.score_history
  for all using (public.is_admin()) with check (public.is_admin());

-- agreements: clients read + create their own acceptances; admins read all.
drop policy if exists "agreements: read own or admin" on public.agreements;
drop policy if exists "agreements: insert own"        on public.agreements;
drop policy if exists "agreements: update own or admin" on public.agreements;
create policy "agreements: read own or admin" on public.agreements
  for select using (user_id = auth.uid() or public.is_admin());
create policy "agreements: insert own" on public.agreements
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "agreements: update own or admin" on public.agreements
  for update using (user_id = auth.uid() or public.is_admin());
