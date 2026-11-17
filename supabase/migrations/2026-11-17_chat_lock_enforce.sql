-- The Lees: chat lock enforced in the database.
-- A locked chat returns no messages to anyone who has not unlocked it recently.
-- Additive except one policy replacement: messages_read. With no lock set, the visible rows are unchanged.
-- Run after 2026-11-17_once.sql. Idempotent.
-- Rollback: restore the old policy and drop the new objects (see the block at the end).

create table if not exists public.chat_unlocks (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);
alter table public.chat_unlocks enable row level security;
revoke all on public.chat_unlocks from anon;
grant select on public.chat_unlocks to authenticated;
drop policy if exists chat_unlocks_own on public.chat_unlocks;
create policy chat_unlocks_own on public.chat_unlocks for select to authenticated
  using (user_id = auth.uid());

-- Failed and successful unlock attempts, used to rate-limit guessing.
create table if not exists public.chat_unlock_attempts (
  id bigint generated always as identity primary key,
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ok boolean not null,
  at timestamptz not null default now()
);
alter table public.chat_unlock_attempts enable row level security;
revoke all on public.chat_unlock_attempts from anon, authenticated;

-- True when the chat is open to the caller: no lock, or a valid unlock within 30 minutes.
create or replace function public.chat_open_for_me(p_pair uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.chat_lock_mode from public.pair_settings s where s.pair_id = p_pair), 'off') = 'off'
      or exists (
        select 1 from public.chat_unlocks u
         where u.pair_id = p_pair
           and u.user_id = auth.uid()
           and u.unlocked_at > now() - interval '30 minutes'
      );
$$;

-- Checks the lock hash the app computed from the passphrase or chat password.
-- On a match, records an unlock for the caller. Ten failed attempts in ten minutes are refused.
create or replace function public.unlock_chat(p_pair uuid, p_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_hash text;
  v_failed int;
begin
  if p_pair not in (select public.my_pair_ids()) then
    raise exception 'not a member of this pair';
  end if;

  select count(*) into v_failed
    from public.chat_unlock_attempts
   where pair_id = p_pair and user_id = auth.uid() and not ok
     and at > now() - interval '10 minutes';
  if v_failed >= 10 then
    raise exception 'too many attempts, wait ten minutes';
  end if;

  select s.chat_lock_mode, s.chat_lock_hash into v_mode, v_hash
    from public.pair_settings s where s.pair_id = p_pair;

  if coalesce(v_mode, 'off') = 'off' then
    return true;
  end if;

  if v_hash is not null and p_hash = v_hash then
    insert into public.chat_unlocks (pair_id, user_id, unlocked_at)
    values (p_pair, auth.uid(), now())
    on conflict (pair_id, user_id) do update set unlocked_at = excluded.unlocked_at;
    insert into public.chat_unlock_attempts (pair_id, user_id, ok) values (p_pair, auth.uid(), true);
    return true;
  end if;

  insert into public.chat_unlock_attempts (pair_id, user_id, ok) values (p_pair, auth.uid(), false);
  return false;
end
$$;

revoke all on function public.chat_open_for_me(uuid) from public, anon;
grant execute on function public.chat_open_for_me(uuid) to authenticated;
revoke all on function public.unlock_chat(uuid, text) from public, anon;
grant execute on function public.unlock_chat(uuid, text) to authenticated;

-- The one policy change: messages are readable only by members, and only while the chat is open to them.
drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (pair_id in (select public.my_pair_ids()) and public.chat_open_for_me(pair_id));

-- Rollback (only if needed):
--   drop policy if exists messages_read on public.messages;
--   create policy messages_read on public.messages for select to authenticated
--     using (pair_id in (select public.my_pair_ids()));
--   drop function if exists public.unlock_chat(uuid, text);
--   drop function if exists public.chat_open_for_me(uuid);
--   drop table if exists public.chat_unlock_attempts, public.chat_unlocks;
