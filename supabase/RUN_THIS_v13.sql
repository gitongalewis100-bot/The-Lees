-- The Lees v13. Idempotent. Safe to run twice. Drops no tables, columns, or data.
-- Adds sealed-letter hiding, sealed_hide, and ARTEN partner facts.

alter table public.sealed_letters
  add column if not exists hidden_for text[] not null default '{}';

-- Same columns and behaviour as the live function, plus the caller's side is excluded from hidden_for.
create or replace function public.sealed_envelopes()
returns table (
  id uuid,
  author_side text,
  recipient_side text,
  title text,
  seal text,
  paper text,
  open_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz,
  ready boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select l.id, l.author_side, l.recipient_side, l.title, l.seal, l.paper, l.open_at, l.opened_at, l.created_at, l.open_at <= now()
  from public.sealed_letters l
  where l.pair_id in (select public.my_pair_ids())
    and not (coalesce(l.hidden_for, '{}') @> array[public.my_side()])
  order by l.open_at;
$$;

revoke all on function public.sealed_envelopes() from public, anon;
grant execute on function public.sealed_envelopes() to authenticated;

create or replace function public.sealed_hide(p_ids uuid[], p_both boolean default false)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s text := public.my_side();
  n int := 0;
  r public.sealed_letters;
begin
  if s is null or s = '' then
    raise exception 'Not a pair member';
  end if;
  if p_ids is null then
    return 0;
  end if;
  for r in
    select * from public.sealed_letters
    where id = any (p_ids)
      and pair_id in (select public.my_pair_ids())
      and (author_side = s or recipient_side = s)
  loop
    if p_both is true and r.author_side = s then
      delete from public.sealed_letters where id = r.id;
      n := n + 1;
    elsif not (coalesce(r.hidden_for, '{}') @> array[s]) then
      update public.sealed_letters
        set hidden_for = coalesce(hidden_for, '{}') || array[s]
        where id = r.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.sealed_hide(uuid[], boolean) from public, anon;
grant execute on function public.sealed_hide(uuid[], boolean) to authenticated;

create table if not exists public.arten_facts (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  owner_side text not null check (owner_side in ('Lewis', 'Agnes')),
  subject_side text not null check (subject_side in ('Lewis', 'Agnes')),
  category text not null default 'like' check (char_length(category) between 1 and 40),
  fact text not null check (char_length(fact) between 1 and 300),
  source text not null default 'manual' check (source in ('manual', 'journal', 'arten')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (owner_side <> subject_side)
);

alter table public.arten_facts enable row level security;
revoke all on public.arten_facts from anon;
grant select, insert, update, delete on public.arten_facts to authenticated;

drop policy if exists arten_facts_select on public.arten_facts;
create policy arten_facts_select on public.arten_facts
  for select to authenticated
  using (pair_id in (select public.my_pair_ids()));

drop policy if exists arten_facts_insert on public.arten_facts;
create policy arten_facts_insert on public.arten_facts
  for insert to authenticated
  with check (owner_side = public.my_side() and pair_id in (select public.my_pair_ids()));

drop policy if exists arten_facts_update on public.arten_facts;
create policy arten_facts_update on public.arten_facts
  for update to authenticated
  using (owner_side = public.my_side() and pair_id in (select public.my_pair_ids()))
  with check (owner_side = public.my_side() and pair_id in (select public.my_pair_ids()));

drop policy if exists arten_facts_delete on public.arten_facts;
create policy arten_facts_delete on public.arten_facts
  for delete to authenticated
  using (owner_side = public.my_side() and pair_id in (select public.my_pair_ids()));

create index if not exists arten_facts_pair_subject_idx on public.arten_facts (pair_id, subject_side);

-- Read-only checks. All four must be true.
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sealed_letters' and column_name = 'hidden_for'
  ) as hidden_for_column,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'sealed_hide'
  ) as sealed_hide_exists,
  exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'arten_facts' and c.relrowsecurity
  ) as arten_facts_rls,
  position('hidden_for' in pg_get_functiondef('public.sealed_envelopes()'::regprocedure)) > 0 as envelopes_exclude_hidden;
