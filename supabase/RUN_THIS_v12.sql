-- The Lees v12: one file. Paste it into the Supabase SQL editor (project emimwlpsfchndxaxzswh) and press Run.
-- Safe to run twice. Additive: nothing existing is dropped or changed except where noted.
--
-- What it adds
--   1. messages.batch_id          photos/videos sent together share one id, so they alert once (app + Telegram)
--   2. pair_members.last_seen_at  "Last seen" that survives closing the app
--   3. activity_log + log_activity()  what each of you did in a session (both of you can read it)
--   4. touch_last_seen()          a cheap heartbeat while the app is open
--   5. trash_restore_all() / trash_purge_all()  the Restore all / Delete all permanently buttons in Recently deleted
--   6. factory_reset(passphrase)  Settings > Reset everything: checks the passphrase on the server, then empties
--                                 the conversation, letters, games, awards, journal, notes, drafts, activity and the
--                                 vault for both of you. Profiles, profile photos, names and sign-in stay.
--   7. pair_settings.reset_at     both phones notice the reset and show the guide again
--   8. a storage policy so either of you can remove files in your shared folder (needed by Delete all / Reset)
--
-- Until this runs the app keeps working: these features say "One database update needed" instead of failing.

-- ---------- 1. Batches ----------
alter table public.messages add column if not exists batch_id uuid;
create index if not exists messages_batch_idx on public.messages (batch_id) where batch_id is not null;

-- One Telegram alert per batch: the first webhook of a batch claims it here, the rest see the claim and stay quiet.
create table if not exists public.notify_batches (
  batch_id uuid primary key,
  claimed_at timestamptz not null default now()
);
alter table public.notify_batches enable row level security;
revoke all on public.notify_batches from anon, authenticated, public;

-- ---------- 2. Last seen ----------
alter table public.pair_members add column if not exists last_seen_at timestamptz;
alter table public.pair_settings add column if not exists reset_at timestamptz;

-- ---------- 3. Activity ----------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('Lewis', 'Agnes')),
  at timestamptz not null default now(),
  action text not null check (char_length(action) between 1 and 40),
  detail text not null default '' check (char_length(detail) <= 200)
);
create index if not exists activity_log_pair_idx on public.activity_log (pair_id, at desc);
alter table public.activity_log enable row level security;
drop policy if exists activity_read on public.activity_log;
create policy activity_read on public.activity_log for select to authenticated
  using (pair_id in (select public.my_pair_ids()));
revoke all on public.activity_log from anon, authenticated;
grant select on public.activity_log to authenticated;

-- Writes go through this function only: a batch of {action, detail, at} from the signed-in person.
-- Keeps the newest 600 rows per person, and stamps last_seen_at.
create or replace function public.log_activity(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare s text := public.my_side(); p uuid; it jsonb; n int := 0; t timestamptz;
begin
  if s is null then raise exception 'not a member'; end if;
  select pair_id into p from public.pair_members where user_id = auth.uid() limit 1;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    n := n + 1;
    exit when n > 60;
    t := coalesce((it->>'at')::timestamptz, now());
    if t > now() + interval '1 minute' or t < now() - interval '2 days' then t := now(); end if;
    insert into public.activity_log (pair_id, user_id, side, at, action, detail)
      values (p, auth.uid(), s, t, left(coalesce(it->>'action', 'other'), 40), left(coalesce(it->>'detail', ''), 200));
  end loop;
  delete from public.activity_log a
   where a.pair_id = p and a.user_id = auth.uid()
     and a.id in (select id from public.activity_log where pair_id = p and user_id = auth.uid() order by at desc offset 600);
  update public.pair_members set last_seen_at = now() where user_id = auth.uid();
end $$;
revoke all on function public.log_activity(jsonb) from public, anon;
grant execute on function public.log_activity(jsonb) to authenticated;

-- ---------- 4. Heartbeat ----------
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.pair_members set last_seen_at = now() where user_id = auth.uid();
$$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- ---------- 5. Recently deleted: restore all / delete all permanently ----------
create or replace function public.trash_restore_all()
returns int language plpgsql security definer set search_path = public as $$
declare s text := public.my_side(); r record; n int := 0;
begin
  if s is null then raise exception 'not a member'; end if;
  for r in select id from public.trash_list() loop
    if public.trash_restore(r.id) then n := n + 1; end if;
  end loop;
  return n;
end $$;
revoke all on function public.trash_restore_all() from public, anon;
grant execute on function public.trash_restore_all() to authenticated;

-- Empties the vault for both of you and removes messages hidden on both sides for good.
-- Returns the media paths that went with them, so the app can remove the files from storage.
create or replace function public.trash_purge_all()
returns setof text language plpgsql security definer set search_path = public as $$
declare s text := public.my_side();
begin
  if s is null then raise exception 'not a member'; end if;
  return query
    with gone as (
      delete from public.message_trash t where t.pair_id in (select public.my_pair_ids()) returning t.original->>'media_path' as p
    ), hidden as (
      delete from public.messages m
       where m.pair_id in (select public.my_pair_ids()) and m.deleted_for @> array['Lewis','Agnes']
      returning m.media_path as p
    )
    select p from gone where p is not null
    union all select p from hidden where p is not null;
end $$;
revoke all on function public.trash_purge_all() from public, anon;
grant execute on function public.trash_purge_all() to authenticated;

-- ---------- 6. Reset everything ----------
-- The passphrase is checked here, on the server, against the account's own password hash.
create extension if not exists pgcrypto with schema extensions;
create or replace function public.factory_reset(p_pass text)
returns setof text language plpgsql security definer set search_path = public, extensions as $$
declare s text := public.my_side(); p uuid; ok boolean; t text;
begin
  if s is null then raise exception 'not a member'; end if;
  select (u.encrypted_password = extensions.crypt(coalesce(p_pass, ''), u.encrypted_password)) into ok
    from auth.users u where u.id = auth.uid();
  if not coalesce(ok, false) then raise exception 'wrong passphrase' using errcode = '28P01'; end if;
  select pair_id into p from public.pair_members where user_id = auth.uid() limit 1;

  -- Files to remove from storage: every message (live or in the vault). Profile photos are not messages.
  return query
    select m.media_path from public.messages m where m.pair_id = p and m.media_path is not null
    union all
    select t.original->>'media_path' from public.message_trash t where t.pair_id = p and t.original->>'media_path' is not null;

  update public.pair_settings set pinned_message_id = null where pair_id = p;
  delete from public.message_trash where pair_id = p;
  delete from public.messages where pair_id = p;
  -- Optional tables: emptied when they exist.
  foreach t in array array['notes','scheduled_messages','journal_entries','drafts','bookmarks','check_ins',
                           'location_shares','sealed_letters','game_sessions','awards','activity_log'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where pair_id = $1', t) using p;
    end if;
  end loop;
  if to_regclass('public.note_reads') is not null then
    delete from public.note_reads where user_id in (select user_id from public.pair_members where pair_id = p);
  end if;
  update public.read_markers set read_at = now() where pair_id = p;
  update public.pair_members set status = '', chat_style = coalesce(chat_style, '{}'::jsonb) - 'mood' where pair_id = p;
  update public.pair_settings set reset_at = now() where pair_id = p;
  return;
end $$;
revoke all on function public.factory_reset(text) from public, anon;
grant execute on function public.factory_reset(text) to authenticated;

-- ---------- 8. Storage: either of you may remove files in your shared folder ----------
drop policy if exists media_delete_pair on storage.objects;
create policy media_delete_pair on storage.objects for delete to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1]) in (select public.my_pair_ids()::text));

-- Live updates for activity (so "Last seen" and the activity list update without a refresh).
do $$ begin
  begin alter publication supabase_realtime add table public.activity_log; exception when duplicate_object then null; end;
end $$;

-- ---------- Checks (read-only). Expect every value true. ----------
select
  exists (select 1 from information_schema.columns where table_name = 'messages' and column_name = 'batch_id') as batch_id,
  exists (select 1 from information_schema.columns where table_name = 'pair_members' and column_name = 'last_seen_at') as last_seen,
  to_regclass('public.activity_log') is not null as activity_log,
  to_regclass('public.notify_batches') is not null as notify_batches,
  (select count(*) = 5 from pg_proc where pronamespace = 'public'::regnamespace
     and proname in ('log_activity','touch_last_seen','trash_restore_all','trash_purge_all','factory_reset')) as functions,
  not has_function_privilege('anon', 'public.factory_reset(text)', 'execute') as anon_blocked;
