-- The Lees v15: adds arten_items, arten_conversations and the 10-day retention purge. Safe to run twice. Deletes nothing that is not already past the 10-day rule (activity log and ARTEN chat history only); arten_notes is kept.

-- ---------- 6.1 arten_items ----------
create table if not exists public.arten_items (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_side text not null check (author_side in ('Lewis','Agnes')),
  subject_side text not null check (subject_side in ('Lewis','Agnes')),
  body text not null check (char_length(body) between 1 and 300),
  source text not null default 'written' check (source in ('written','arten')),
  status text not null default 'saved' check (status in ('saved','proposed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists arten_items_pair_idx on public.arten_items (pair_id, subject_side);
alter table public.arten_items enable row level security;
revoke all on public.arten_items from anon, public;
grant select, insert, update, delete on public.arten_items to authenticated;
drop policy if exists arten_items_select on public.arten_items;
create policy arten_items_select on public.arten_items for select to authenticated
  using (pair_id in (select public.my_pair_ids()) and (status = 'saved' or author_side = public.my_side()));
drop policy if exists arten_items_insert on public.arten_items;
create policy arten_items_insert on public.arten_items for insert to authenticated
  with check (author_side = public.my_side() and pair_id in (select public.my_pair_ids()));
drop policy if exists arten_items_update on public.arten_items;
create policy arten_items_update on public.arten_items for update to authenticated
  using (author_side = public.my_side() and pair_id in (select public.my_pair_ids()))
  with check (author_side = public.my_side() and pair_id in (select public.my_pair_ids()));
drop policy if exists arten_items_delete on public.arten_items;
create policy arten_items_delete on public.arten_items for delete to authenticated
  using (author_side = public.my_side() and pair_id in (select public.my_pair_ids()));

-- ---------- 6.2 migrate arten_notes (one item per non-empty line; arten_notes is not deleted) ----------
do $$
begin
  if to_regclass('public.arten_notes') is not null then
    insert into public.arten_items (pair_id, author_side, subject_side, body, source, status)
    select n.pair_id, n.owner_side,
           case when n.subject = 'me' then n.owner_side when n.owner_side = 'Lewis' then 'Agnes' else 'Lewis' end,
           left(btrim(l.line), 300), 'written', 'saved'
      from public.arten_notes n
      cross join lateral regexp_split_to_table(n.body, E'\\r?\\n') as l(line)
     where btrim(l.line) <> ''
       and not exists (
         select 1 from public.arten_items i
          where i.pair_id = n.pair_id and i.author_side = n.owner_side
            and i.subject_side = (case when n.subject = 'me' then n.owner_side when n.owner_side = 'Lewis' then 'Agnes' else 'Lewis' end)
            and i.body = left(btrim(l.line), 300));
  end if;
end $$;

-- ---------- 6.3 arten_conversations ----------
create table if not exists public.arten_conversations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('Lewis','Agnes')),
  title text not null default '' check (char_length(title) <= 120),
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages) = 'array' and octet_length(messages::text) <= 200000),
  started_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists arten_conversations_user_idx on public.arten_conversations (user_id, started_at desc);
alter table public.arten_conversations enable row level security;
revoke all on public.arten_conversations from anon, public;
grant select, insert, update, delete on public.arten_conversations to authenticated;
drop policy if exists arten_conv_select on public.arten_conversations;
create policy arten_conv_select on public.arten_conversations for select to authenticated using (user_id = auth.uid());
drop policy if exists arten_conv_insert on public.arten_conversations;
create policy arten_conv_insert on public.arten_conversations for insert to authenticated with check (user_id = auth.uid());
drop policy if exists arten_conv_update on public.arten_conversations;
create policy arten_conv_update on public.arten_conversations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists arten_conv_delete on public.arten_conversations;
create policy arten_conv_delete on public.arten_conversations for delete to authenticated using (user_id = auth.uid());

-- ---------- 6.4 purge for the signed-in person ----------
create or replace function public.purge_retained_for_me()
returns void language plpgsql security definer set search_path = public as $$
declare cutoff timestamptz := date_trunc('day', now() at time zone 'utc') - interval '10 days';
begin
  if auth.uid() is null then return; end if;
  if to_regclass('public.activity_log') is not null then
    delete from public.activity_log
     where pair_id in (select public.my_pair_ids())
       and date_trunc('day', at at time zone 'utc') < cutoff;
  end if;
  delete from public.arten_conversations where user_id = auth.uid() and started_at < cutoff;
end $$;
revoke all on function public.purge_retained_for_me() from public, anon;
grant execute on function public.purge_retained_for_me() to authenticated;

-- ---------- 6.5 purge for everyone (scheduler only) ----------
create or replace function public.purge_retained_all()
returns void language plpgsql security definer set search_path = public as $$
declare cutoff timestamptz := date_trunc('day', now() at time zone 'utc') - interval '10 days';
begin
  if to_regclass('public.activity_log') is not null then
    delete from public.activity_log where date_trunc('day', at at time zone 'utc') < cutoff;
  end if;
  delete from public.arten_conversations where started_at < cutoff;
end $$;
revoke all on function public.purge_retained_all() from public, anon, authenticated;

-- ---------- 6.6 daily schedule (skipped quietly if pg_cron is unavailable) ----------
do $$
begin
  create extension if not exists pg_cron;
  begin perform cron.unschedule('lees-retention'); exception when others then null; end;
  perform cron.schedule('lees-retention', '10 3 * * *', 'select public.purge_retained_all()');
exception when others then
  raise notice 'pg_cron not available; the app still purges on sign-in and when Activity opens (%).', sqlerrm;
end $$;

-- ---------- 6.7 checks (read-only). Every value should be true. ----------
select (select relrowsecurity from pg_class where oid = to_regclass('public.arten_items')) as check;
select (select relrowsecurity from pg_class where oid = to_regclass('public.arten_conversations')) as check;
select to_regprocedure('public.purge_retained_for_me()') is not null as check;
select to_regprocedure('public.purge_retained_all()') is not null as check;
select not has_function_privilege('authenticated', 'public.purge_retained_all()', 'execute') as check;
