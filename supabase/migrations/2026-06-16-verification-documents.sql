-- ════════════════════════════════════════════════════════════════════
-- Migration: identity verification documents (2026-06-16)
-- Adds the verification_documents table + private storage bucket used by
-- the signup/customer-journey "upload verification documents" step.
-- Idempotent — safe to run once in the Supabase SQL Editor.
-- (Re-running the full schema.sql also applies this; this file is just the
--  focused diff for the existing live database.)
--
-- Approval is MANUAL: a human admin reviews each document and marks it
-- approved or rejected (with an optional note). Nothing is auto-verified.
-- Mirrors the credit_reports model exactly (private bucket, path-scoped
-- RLS, client owns their folder, admins read all).
-- ════════════════════════════════════════════════════════════════════

-- verification_documents (client uploads identity docs) ───────────────
create table if not exists public.verification_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  category    text not null
                check (category in ('photo_id', 'proof_of_address', 'proof_of_ssn')),
  doc_type    text,                    -- e.g. "Driver's License", "Utility Bill"
  file_path   text not null,           -- path inside the 'verification-documents' bucket
  file_name   text not null,
  file_size   integer,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  review_note text,                    -- admin's reason when rejected
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now()
);
create index if not exists verification_documents_user_id_idx
  on public.verification_documents (user_id);

alter table public.verification_documents enable row level security;

-- A client manages their own rows; admins read/manage all. The client can
-- insert and read their own; status changes (approve/reject) happen via the
-- service-role admin client, which bypasses RLS.
drop policy if exists "verification_documents: read own or admin"  on public.verification_documents;
drop policy if exists "verification_documents: insert own"          on public.verification_documents;
drop policy if exists "verification_documents: update own or admin" on public.verification_documents;

create policy "verification_documents: read own or admin" on public.verification_documents
  for select using (user_id = auth.uid() or public.is_admin());
create policy "verification_documents: insert own" on public.verification_documents
  for insert with check (user_id = auth.uid());
create policy "verification_documents: update own or admin" on public.verification_documents
  for update using (user_id = auth.uid() or public.is_admin());

-- ── Private storage bucket + path-scoped RLS ────────────────────────
-- Path convention: <user_id>/<filename>  → first folder = owner uid
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
