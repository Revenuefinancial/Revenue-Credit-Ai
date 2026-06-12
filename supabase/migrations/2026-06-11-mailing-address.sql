-- Adds the client's mailing address to their profile so generated dispute
-- letters can be fully filled in (sender block) with no bracketed placeholders.
-- Idempotent — safe to run more than once.

alter table public.profiles
  add column if not exists mailing_address text;
