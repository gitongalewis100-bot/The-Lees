-- The Lees: database migration for checkpoint 3 (shared tagline and journal storage)
-- Run in the Supabase SQL editor AFTER checking the live schema.
-- Idempotent: safe to run more than once. Drops nothing.

-- 1. Shared lock-screen tagline, editable from Settings.
alter table public.pair_settings
  add column if not exists tagline text not null default 'Do what you love, love what you do.'
  check (char_length(tagline) between 1 and 80);
grant update (tagline) on public.pair_settings to authenticated;

-- 2. Journal entries: the app reads and writes this table, but schema.sql did not define it.
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  side text not null,
  kind text not null default 'diary',
  text text not null default '',
  created_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
revoke all on public.journal_entries from anon;
grant select, insert on public.journal_entries to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'journal_entries' and policyname = 'journal_read') then
    create policy journal_read on public.journal_entries
      for select to authenticated
      using (pair_id in (select public.my_pair_ids()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'journal_entries' and policyname = 'journal_insert') then
    create policy journal_insert on public.journal_entries
      for insert to authenticated
      with check (pair_id in (select public.my_pair_ids()) and side = public.my_side());
  end if;
end $$;

-- 3. Private storage bucket for photos and voice notes. Existing object policies are left as they are.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
