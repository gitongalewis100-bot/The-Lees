-- The Lees: feature migration (receipts, view once, chat lock, drafts, bookmarks,
-- check-ins, location shares, mute timer, quiet requests, captions).
-- Run in the Supabase SQL editor AFTER 2026-11-16_messages_video_archive.sql and
-- 2026-11-16_checkpoint3.sql. Idempotent: safe to run more than once. Drops nothing.
-- Rollback: see the comment block at the end.

-- 1. Messages: receipts, one-time media, quiet send, undo window, vanishing timer, transcripts.
alter table public.messages add column if not exists seen_at timestamptz;
alter table public.messages add column if not exists once boolean not null default false;
alter table public.messages add column if not exists opened_by text[] not null default '{}';
alter table public.messages add column if not exists quiet boolean not null default false;
alter table public.messages add column if not exists undo_until timestamptz;
alter table public.messages add column if not exists vanish_at timestamptz;
alter table public.messages add column if not exists transcript text;
alter table public.messages add column if not exists speed_pref real not null default 1
  check (speed_pref in (1, 1.5, 2));

-- 2. Per-person settings on the membership row.
alter table public.pair_members add column if not exists read_receipts boolean not null default true;
alter table public.pair_members add column if not exists quiet_requests boolean not null default false;
alter table public.pair_members add column if not exists captions boolean not null default true;
alter table public.pair_members add column if not exists keep_out_of_gallery boolean not null default true;
alter table public.pair_members add column if not exists muted_until timestamptz;
grant update (read_receipts, quiet_requests, captions, keep_out_of_gallery, muted_until)
  on public.pair_members to authenticated;

-- 3. Chat lock, per pair. The app stores only a salted hash, never the passphrase.
alter table public.pair_settings add column if not exists chat_lock_mode text not null default 'off'
  check (chat_lock_mode in ('off', 'passphrase', 'password'));
alter table public.pair_settings add column if not exists chat_lock_salt text;
alter table public.pair_settings add column if not exists chat_lock_hash text;
grant update (chat_lock_mode, chat_lock_salt, chat_lock_hash) on public.pair_settings to authenticated;

-- 4. Drafts: one unsent text per person per pair.
create table if not exists public.drafts (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 10000),
  updated_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);
alter table public.drafts enable row level security;
revoke all on public.drafts from anon;
grant select, insert, update, delete on public.drafts to authenticated;
drop policy if exists drafts_own on public.drafts;
create policy drafts_own on public.drafts for all to authenticated
  using (user_id = auth.uid() and pair_id in (select public.my_pair_ids()))
  with check (user_id = auth.uid() and pair_id in (select public.my_pair_ids()));

-- 5. Bookmarks: private to the person who saved them.
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);
alter table public.bookmarks enable row level security;
revoke all on public.bookmarks from anon;
grant select, insert, delete on public.bookmarks to authenticated;
drop policy if exists bookmarks_own on public.bookmarks;
create policy bookmarks_own on public.bookmarks for all to authenticated
  using (user_id = auth.uid() and pair_id in (select public.my_pair_ids()))
  with check (user_id = auth.uid() and pair_id in (select public.my_pair_ids()));

-- 6. Arrival check-ins: one person asks, the other confirms.
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  note text not null default '' check (char_length(note) <= 280),
  due_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.check_ins enable row level security;
revoke all on public.check_ins from anon;
grant select, insert, update on public.check_ins to authenticated;
drop policy if exists check_ins_read on public.check_ins;
create policy check_ins_read on public.check_ins for select to authenticated
  using (pair_id in (select public.my_pair_ids()));
drop policy if exists check_ins_insert on public.check_ins;
create policy check_ins_insert on public.check_ins for insert to authenticated
  with check (requester_id = auth.uid() and pair_id in (select public.my_pair_ids()));
drop policy if exists check_ins_confirm on public.check_ins;
create policy check_ins_confirm on public.check_ins for update to authenticated
  using (pair_id in (select public.my_pair_ids()))
  with check (pair_id in (select public.my_pair_ids()));

-- 7. Live location shares, with an expiry the app enforces.
create table if not exists public.location_shares (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (pair_id, user_id)
);
alter table public.location_shares enable row level security;
revoke all on public.location_shares from anon;
grant select, insert, update, delete on public.location_shares to authenticated;
drop policy if exists location_read on public.location_shares;
create policy location_read on public.location_shares for select to authenticated
  using (pair_id in (select public.my_pair_ids()));
drop policy if exists location_own on public.location_shares;
create policy location_own on public.location_shares for all to authenticated
  using (user_id = auth.uid() and pair_id in (select public.my_pair_ids()))
  with check (user_id = auth.uid() and pair_id in (select public.my_pair_ids()));

-- Rollback (run only if you must undo this migration; it removes the new data):
--   drop table if exists public.location_shares, public.check_ins, public.bookmarks, public.drafts;
--   alter table public.messages drop column if exists seen_at, drop column if exists once,
--     drop column if exists opened_by, drop column if exists quiet, drop column if exists undo_until,
--     drop column if exists vanish_at, drop column if exists transcript, drop column if exists speed_pref;
--   alter table public.pair_members drop column if exists read_receipts, drop column if exists quiet_requests,
--     drop column if exists captions, drop column if exists keep_out_of_gallery, drop column if exists muted_until;
--   alter table public.pair_settings drop column if exists chat_lock_mode, drop column if exists chat_lock_salt,
--     drop column if exists chat_lock_hash;
