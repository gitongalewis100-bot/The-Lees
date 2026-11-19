-- The Lees v11: "Delete for both" and "Clear conversation" (both sides) now truly remove messages from the
-- conversation, and every removed message is kept in a shared, recoverable vault (message_trash) that both of
-- you can open from a hidden place in Settings. Nothing in the vault ever expires.
--
-- Safe to run more than once. Additive: creates one table and four functions. Changes no existing function,
-- so the current app keeps working before and after this runs.
--
-- Rollback (only if you must; it drops the vault and everything in it):
--   drop function if exists public.trash_restore(uuid);
--   drop function if exists public.trash_list();
--   drop function if exists public.trash_clear(text, timestamptz, timestamptz);
--   drop function if exists public.trash_delete_both(uuid);
--   drop table if exists public.message_trash;

-- ---------- The vault ----------
create table if not exists public.message_trash (
  id uuid primary key,                         -- the original message id
  pair_id uuid not null references public.pairs(id) on delete cascade,
  original jsonb not null,                     -- the whole message row as it was before deletion
  scope text not null default 'both' check (scope in ('both', 'clear')),
  deleted_by text,                             -- 'Lewis' or 'Agnes'
  deleted_at timestamptz not null default now()
);
create index if not exists message_trash_pair_idx on public.message_trash (pair_id, deleted_at desc);
alter table public.message_trash enable row level security;
drop policy if exists trash_read on public.message_trash;
create policy trash_read on public.message_trash for select to authenticated
  using (pair_id in (select public.my_pair_ids()));
revoke all on public.message_trash from anon;
revoke insert, update, delete on public.message_trash from authenticated;
grant select on public.message_trash to authenticated;

-- ---------- Delete one message for both ----------
-- Copies the message into the vault, then leaves a "This message was deleted" tombstone in the chat.
-- The media file is kept in storage so the message can be restored later.
create or replace function public.trash_delete_both(p_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare s text := public.my_side(); m public.messages;
begin
  if s is null then raise exception 'not a member'; end if;
  select * into m from public.messages where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  if m.deleted then return null; end if;
  if m.sender_id is distinct from auth.uid() and m.kind = 'text' then raise exception 'only the sender'; end if;
  if m.created_at < now() - interval '24 hours' then raise exception 'too late'; end if;
  insert into public.message_trash (id, pair_id, original, scope, deleted_by)
    values (m.id, m.pair_id, to_jsonb(m), 'both', s)
    on conflict (id) do update set original = excluded.original, scope = 'both', deleted_by = excluded.deleted_by, deleted_at = now();
  update public.messages
     set deleted = true, text = '', media_path = null, moment = false, hidden_for = '{}', history = '[]'::jsonb
   where id = p_id;
  return null;
end $$;
revoke all on function public.trash_delete_both(uuid) from public, anon;
grant execute on function public.trash_delete_both(uuid) to authenticated;

-- ---------- Clear conversation ----------
-- 'me'   : hides the range on my side only (as before; recoverable from the vault).
-- 'both' : moves every message in the range into the vault and deletes it from the conversation for real.
create or replace function public.trash_clear(p_scope text, p_from timestamptz default null, p_to timestamptz default null)
returns int language plpgsql security definer set search_path = public as $$
declare s text := public.my_side(); n int := 0;
begin
  if s is null then raise exception 'not a member'; end if;
  if p_scope not in ('me', 'both') then raise exception 'bad scope'; end if;
  if p_scope = 'me' then
    update public.messages m
       set deleted_for = (select array(select distinct unnest(m.deleted_for || array[s])))
     where m.pair_id in (select public.my_pair_ids())
       and (p_from is null or m.created_at >= p_from)
       and (p_to is null or m.created_at < p_to);
    get diagnostics n = row_count;
    return n;
  end if;
  insert into public.message_trash (id, pair_id, original, scope, deleted_by)
    select m.id, m.pair_id, to_jsonb(m), 'clear', s
      from public.messages m
     where m.pair_id in (select public.my_pair_ids())
       and not m.deleted
       and (p_from is null or m.created_at >= p_from)
       and (p_to is null or m.created_at < p_to)
    on conflict (id) do update set original = excluded.original, scope = 'clear', deleted_by = excluded.deleted_by, deleted_at = now();
  update public.pair_settings ps set pinned_message_id = null
   where ps.pair_id in (select public.my_pair_ids())
     and ps.pinned_message_id in (select m.id from public.messages m
       where m.pair_id = ps.pair_id and (p_from is null or m.created_at >= p_from) and (p_to is null or m.created_at < p_to));
  delete from public.messages m
   where m.pair_id in (select public.my_pair_ids())
     and (p_from is null or m.created_at >= p_from)
     and (p_to is null or m.created_at < p_to);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.trash_clear(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.trash_clear(text, timestamptz, timestamptz) to authenticated;

-- ---------- List everything recoverable ----------
-- Vault rows (deleted for both or cleared), plus messages still hidden on my side (Delete for me, or an older
-- "Clear for both" that only hid rows). scope: 'both' | 'clear' | 'me' | 'hidden-both'.
create or replace function public.trash_list()
returns table (id uuid, original jsonb, scope text, deleted_by text, deleted_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare s text := public.my_side();
begin
  if s is null then raise exception 'not a member'; end if;
  return query
    select t.id, t.original, t.scope, t.deleted_by, t.deleted_at
      from public.message_trash t
     where t.pair_id in (select public.my_pair_ids())
    union all
    select m.id, to_jsonb(m),
           case when m.deleted_for @> array['Lewis','Agnes'] then 'hidden-both' else 'me' end,
           s, m.created_at
      from public.messages m
     where m.pair_id in (select public.my_pair_ids())
       and s = any (m.deleted_for)
       and not m.deleted
       and not exists (select 1 from public.message_trash t2 where t2.id = m.id)
    order by 5 desc
    limit 5000;
end $$;
revoke all on function public.trash_list() from public, anon;
grant execute on function public.trash_list() to authenticated;

-- ---------- Restore ----------
create or replace function public.trash_restore(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare s text := public.my_side(); t public.message_trash; r public.messages; cur public.messages;
begin
  if s is null then raise exception 'not a member'; end if;
  select * into t from public.message_trash where id = p_id and pair_id in (select public.my_pair_ids());
  if t.id is null then
    -- Hidden, not removed: unhide it (for both sides if it was hidden from both).
    update public.messages m
       set deleted_for = case when m.deleted_for @> array['Lewis','Agnes'] then '{}'::text[] else array_remove(m.deleted_for, s) end
     where m.id = p_id and m.pair_id in (select public.my_pair_ids()) and s = any (m.deleted_for);
    return found;
  end if;
  r := jsonb_populate_record(null::public.messages, t.original);
  select * into cur from public.messages where id = p_id;
  if cur.id is not null then
    update public.messages
       set kind = r.kind, text = r.text, media_path = r.media_path, dur = r.dur, reply_to = r.reply_to,
           history = coalesce(r.history, '[]'::jsonb), moment = coalesce(r.moment, false),
           deleted = false, deleted_for = '{}'
     where id = p_id;
  else
    insert into public.messages (id, pair_id, sender_id, kind, text, media_path, reply_to, effect, hearts,
                                 history, moment, dur, client_id, created_at, transcript, once, quiet)
    values (r.id, t.pair_id, r.sender_id, r.kind, r.text, r.media_path, r.reply_to, coalesce(r.effect, 'none'),
            coalesce(r.hearts, '{}'), coalesce(r.history, '[]'::jsonb), coalesce(r.moment, false), r.dur,
            r.client_id, coalesce(r.created_at, now()), r.transcript, coalesce(r.once, false), coalesce(r.quiet, false));
  end if;
  delete from public.message_trash where id = p_id;
  return true;
end $$;
revoke all on function public.trash_restore(uuid) from public, anon;
grant execute on function public.trash_restore(uuid) to authenticated;

-- Live updates for the vault (so the other side sees deletions/restores without a refresh).
do $$ begin
  begin alter publication supabase_realtime add table public.message_trash; exception when duplicate_object then null; end;
end $$;
