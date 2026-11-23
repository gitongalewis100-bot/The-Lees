-- The Lees v14. Additive and safe to run again. Drops nothing.
-- ARTEN notes (about me / about partner) and a personal theme preference.

create table if not exists public.arten_notes (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  owner_side text not null check (owner_side in ('Lewis', 'Agnes')),
  subject text not null check (subject in ('me', 'other')),
  body text not null default '' check (char_length(body) <= 4000),
  updated_at timestamptz not null default now(),
  unique (pair_id, owner_side, subject)
);

alter table public.arten_notes enable row level security;

drop policy if exists arten_notes_all on public.arten_notes;
create policy arten_notes_all on public.arten_notes
  for all to authenticated
  using (owner_side = public.my_side() and pair_id in (select public.my_pair_ids()))
  with check (owner_side = public.my_side() and pair_id in (select public.my_pair_ids()));

revoke all on table public.arten_notes from public, anon;
grant select, insert, update, delete on table public.arten_notes to authenticated;

-- Copy existing facts into the About-partner note. A later edit is kept on re-run.
insert into public.arten_notes (pair_id, owner_side, subject, body)
select f.pair_id, f.owner_side, 'other',
  left(string_agg(f.fact, E'\n' order by f.created_at), 4000)
from public.arten_facts f
group by f.pair_id, f.owner_side
on conflict (pair_id, owner_side, subject) do update
  set body = case when public.arten_notes.body = '' then excluded.body else public.arten_notes.body end,
      updated_at = case when public.arten_notes.body = '' then now() else public.arten_notes.updated_at end;

create table if not exists public.user_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'ink-night' check (char_length(theme) between 1 and 40),
  updated_at timestamptz not null default now()
);

alter table public.user_prefs enable row level security;

drop policy if exists user_prefs_select on public.user_prefs;
drop policy if exists user_prefs_insert on public.user_prefs;
drop policy if exists user_prefs_update on public.user_prefs;
create policy user_prefs_select on public.user_prefs for select to authenticated using (user_id = auth.uid());
create policy user_prefs_insert on public.user_prefs for insert to authenticated with check (user_id = auth.uid());
create policy user_prefs_update on public.user_prefs for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on table public.user_prefs from public, anon;
grant select, insert, update on table public.user_prefs to authenticated;

-- Read-only checks. Every value must be true.
select
  (to_regclass('public.arten_notes') is not null) as arten_notes_exists,
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'arten_notes'), false) as arten_notes_rls,
  (to_regclass('public.user_prefs') is not null) as user_prefs_exists,
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'user_prefs'), false) as user_prefs_rls,
  ((select count(*) from public.arten_notes) >= (select count(*) from (select distinct pair_id, owner_side from public.arten_facts) g)) as notes_cover_facts;
