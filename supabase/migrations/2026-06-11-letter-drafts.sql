-- ════════════════════════════════════════════════════════════════════
-- Migration: AI letter drafts (2026-06-11)
-- Adds the letter_drafts table used by the AI dispute-letter generator.
-- Idempotent — safe to run once in the Supabase SQL Editor.
-- (Re-running the full schema.sql also applies this; this file is just
--  the focused diff for an existing database.)
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.letter_drafts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  report_id   uuid references public.credit_reports (id) on delete set null,
  bureau      text not null,
  subject     text,
  body        text not null,
  round       integer not null default 1,
  model       text,
  status      text not null default 'draft'
                check (status in ('draft', 'approved', 'rejected')),
  created_by  uuid references public.profiles (id),
  approved_by uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists letter_drafts_user_id_idx on public.letter_drafts (user_id);

alter table public.letter_drafts enable row level security;

drop policy if exists "letter_drafts: read own approved or admin" on public.letter_drafts;
drop policy if exists "letter_drafts: admin write"               on public.letter_drafts;

create policy "letter_drafts: read own approved or admin" on public.letter_drafts
  for select using (
    public.is_admin()
    or (user_id = auth.uid() and status = 'approved')
  );
create policy "letter_drafts: admin write" on public.letter_drafts
  for all using (public.is_admin()) with check (public.is_admin());
