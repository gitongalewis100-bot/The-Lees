-- The Lees v8: sealed letters, live games (tic-tac-toe first), awards.
-- Additive and idempotent. Applied live on 2026-11-18.

-- ---------- Sealed letters ----------
create table if not exists public.sealed_letters (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_side text not null check (author_side in ('Lewis','Agnes')),
  recipient_side text not null check (recipient_side in ('Lewis','Agnes')),
  title text not null default '' check (char_length(title) <= 80),
  body text not null check (char_length(body) between 1 and 20000),
  seal text not null default 'wax-red' check (char_length(seal) <= 30),
  paper text not null default 'cream' check (char_length(paper) <= 30),
  open_at timestamptz not null,
  opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sealed_letters_pair_idx on public.sealed_letters(pair_id, open_at);
alter table public.sealed_letters enable row level security;

-- The author always reads their letter. The recipient reads the row (and so the body) only once the date has come.
drop policy if exists sealed_read on public.sealed_letters;
create policy sealed_read on public.sealed_letters for select using (
  pair_id in (select public.my_pair_ids())
  and (author_id = auth.uid() or (recipient_side = public.my_side() and open_at <= now()))
);
drop policy if exists sealed_insert on public.sealed_letters;
create policy sealed_insert on public.sealed_letters for insert with check (
  pair_id in (select public.my_pair_ids()) and author_id = auth.uid() and author_side = public.my_side()
  and recipient_side <> author_side
);
-- The author may change or withdraw a letter only while it is still sealed.
drop policy if exists sealed_update on public.sealed_letters;
create policy sealed_update on public.sealed_letters for update using (author_id = auth.uid() and open_at > now() and opened_at is null)
  with check (author_id = auth.uid() and author_side = public.my_side());
drop policy if exists sealed_delete on public.sealed_letters;
create policy sealed_delete on public.sealed_letters for delete using (author_id = auth.uid() and open_at > now() and opened_at is null);
grant select, insert, update, delete on public.sealed_letters to authenticated;

-- Envelopes: the outside of every letter in my pair, never the body.
create or replace function public.sealed_envelopes()
returns table (id uuid, author_side text, recipient_side text, title text, seal text, paper text, open_at timestamptz, opened_at timestamptz, created_at timestamptz, ready boolean)
language sql stable security definer set search_path = public as $$
  select l.id, l.author_side, l.recipient_side, l.title, l.seal, l.paper, l.open_at, l.opened_at, l.created_at, l.open_at <= now()
  from public.sealed_letters l
  where l.pair_id in (select public.my_pair_ids())
  order by l.open_at;
$$;
revoke all on function public.sealed_envelopes() from public, anon;
grant execute on function public.sealed_envelopes() to authenticated;

-- Opening: returns the full letter only when allowed, and stamps the first opening by the recipient.
create or replace function public.open_sealed_letter(p_id uuid)
returns setof public.sealed_letters
language plpgsql security definer set search_path = public as $$
declare l public.sealed_letters; s text := public.my_side();
begin
  select * into l from public.sealed_letters where id = p_id and pair_id in (select public.my_pair_ids());
  if not found then raise exception 'Letter not found'; end if;
  if l.author_id <> auth.uid() then
    if l.recipient_side <> s then raise exception 'Not your letter'; end if;
    if l.open_at > now() then raise exception 'This letter is still sealed'; end if;
    if l.opened_at is null then
      update public.sealed_letters set opened_at = now() where id = p_id returning * into l;
    end if;
  end if;
  return next l;
end $$;
revoke all on function public.open_sealed_letter(uuid) from public, anon;
grant execute on function public.open_sealed_letter(uuid) to authenticated;

-- ---------- Games ----------
create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  kind text not null default 'tictactoe' check (kind in ('tictactoe')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited','active','done','abandoned')),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_sessions_pair_idx on public.game_sessions(pair_id, created_at desc);
alter table public.game_sessions enable row level security;
drop policy if exists games_read on public.game_sessions;
create policy games_read on public.game_sessions for select using (pair_id in (select public.my_pair_ids()));
grant select on public.game_sessions to authenticated;

create or replace function public._ttt_winner(b jsonb)
returns jsonb language plpgsql immutable as $$
declare lines int[][] := array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]; i int; a text;
begin
  for i in 1..8 loop
    a := b->>lines[i][1];
    if a is not null and a <> '' and a = b->>lines[i][2] and a = b->>lines[i][3] then
      return jsonb_build_object('side', a, 'line', to_jsonb(array[lines[i][1], lines[i][2], lines[i][3]]));
    end if;
  end loop;
  return null;
end $$;

-- Start a game: invite the other side. The other side accepts with game_accept.
create or replace function public.game_start(p_kind text default 'tictactoe')
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare pid uuid; s text := public.my_side(); g public.game_sessions;
begin
  select pair_id into pid from public.pair_members where user_id = auth.uid();
  if pid is null then raise exception 'No pair'; end if;
  update public.game_sessions set status = 'abandoned', updated_at = now()
    where pair_id = pid and status in ('invited','active') and updated_at < now() - interval '30 minutes';
  select * into g from public.game_sessions where pair_id = pid and status in ('invited','active') order by created_at desc limit 1;
  if found then return g; end if;
  insert into public.game_sessions(pair_id, kind, status, state)
  values (pid, coalesce(p_kind,'tictactoe'), 'invited', jsonb_build_object(
    'board', '["","","","","","","","",""]'::jsonb, 'x', s, 'starter', s, 'turn', s,
    'deadline', null, 'winner', null, 'line', null, 'moves', '[]'::jsonb, 'by', s, 'timeouts', 0, 'turn_ms', 10000))
  returning * into g;
  return g;
end $$;

create or replace function public.game_accept(p_id uuid)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare g public.game_sessions;
begin
  select * into g from public.game_sessions where id = p_id and pair_id in (select public.my_pair_ids()) for update;
  if not found then raise exception 'Game not found'; end if;
  if g.status = 'invited' then
    update public.game_sessions set status = 'active', updated_at = now(),
      state = g.state || jsonb_build_object('deadline', to_jsonb(now() + interval '10 seconds'), 'started_at', to_jsonb(now()))
      where id = p_id returning * into g;
  end if;
  return g;
end $$;

-- A move is checked here: right player, empty cell, before the deadline (with 1.5 s grace for the network).
create or replace function public.game_move(p_id uuid, p_cell int)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare g public.game_sessions; s text := public.my_side(); st jsonb; b jsonb; w jsonb; nxt text; is_full boolean; dl timestamptz;
begin
  select * into g from public.game_sessions where id = p_id and pair_id in (select public.my_pair_ids()) for update;
  if not found then raise exception 'Game not found'; end if;
  if g.status <> 'active' then raise exception 'This game is not running'; end if;
  st := g.state;
  if st->>'turn' <> s then raise exception 'Not your turn'; end if;
  dl := (st->>'deadline')::timestamptz;
  if dl is not null and now() > dl + interval '1500 milliseconds' then raise exception 'Time ran out'; end if;
  if p_cell < 0 or p_cell > 8 then raise exception 'Bad cell'; end if;
  b := st->'board';
  if coalesce(b->>p_cell, '') <> '' then raise exception 'That square is taken'; end if;
  b := jsonb_set(b, array[p_cell::text], to_jsonb(s));
  w := public._ttt_winner(b);
  is_full := not exists (select 1 from jsonb_array_elements_text(b) e where e = '');
  nxt := case when s = 'Lewis' then 'Agnes' else 'Lewis' end;
  st := st || jsonb_build_object('board', b, 'turn', nxt, 'timeouts', 0,
    'moves', (st->'moves') || jsonb_build_array(jsonb_build_object('side', s, 'cell', p_cell, 'ms', greatest(0, (extract(epoch from (now() - coalesce(dl - interval '10 seconds', now()))) * 1000)::int), 'at', now())),
    'deadline', to_jsonb(now() + interval '10 seconds'));
  if w is not null then
    st := st || jsonb_build_object('winner', w->'side', 'line', w->'line', 'deadline', null, 'ended_at', to_jsonb(now()));
    update public.game_sessions set state = st, status = 'done', updated_at = now() where id = p_id returning * into g;
  elsif is_full then
    st := st || jsonb_build_object('winner', 'draw', 'deadline', null, 'ended_at', to_jsonb(now()));
    update public.game_sessions set state = st, status = 'done', updated_at = now() where id = p_id returning * into g;
  else
    update public.game_sessions set state = st, updated_at = now() where id = p_id returning * into g;
  end if;
  return g;
end $$;

-- When the clock runs out the turn passes. Either player may call it; it only acts after the deadline.
-- Three missed turns in a row ends the game as abandoned.
create or replace function public.game_timeout(p_id uuid)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare g public.game_sessions; st jsonb; dl timestamptz; t text; n int;
begin
  select * into g from public.game_sessions where id = p_id and pair_id in (select public.my_pair_ids()) for update;
  if not found then raise exception 'Game not found'; end if;
  if g.status <> 'active' then return g; end if;
  st := g.state; dl := (st->>'deadline')::timestamptz;
  if dl is null or now() < dl + interval '1500 milliseconds' then return g; end if;
  t := case when st->>'turn' = 'Lewis' then 'Agnes' else 'Lewis' end;
  n := coalesce((st->>'timeouts')::int, 0) + 1;
  if n >= 4 then
    update public.game_sessions set status = 'abandoned', updated_at = now(),
      state = st || jsonb_build_object('deadline', null, 'timeouts', n, 'ended_at', to_jsonb(now())) where id = p_id returning * into g;
  else
    update public.game_sessions set updated_at = now(),
      state = st || jsonb_build_object('turn', t, 'timeouts', n, 'deadline', to_jsonb(now() + interval '10 seconds'), 'skipped', st->>'turn')
      where id = p_id returning * into g;
  end if;
  return g;
end $$;

create or replace function public.game_quit(p_id uuid)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare g public.game_sessions; s text := public.my_side();
begin
  update public.game_sessions set status = 'abandoned', updated_at = now(),
    state = state || jsonb_build_object('deadline', null, 'quit_by', s, 'ended_at', to_jsonb(now()))
    where id = p_id and pair_id in (select public.my_pair_ids()) and status in ('invited','active') returning * into g;
  return g;
end $$;

-- Rematch: a fresh board, the loser (or the other side after a draw) starts.
create or replace function public.game_rematch(p_id uuid)
returns public.game_sessions language plpgsql security definer set search_path = public as $$
declare old public.game_sessions; g public.game_sessions; s text := public.my_side(); starter text;
begin
  select * into old from public.game_sessions where id = p_id and pair_id in (select public.my_pair_ids());
  if not found then raise exception 'Game not found'; end if;
  select * into g from public.game_sessions where pair_id = old.pair_id and status in ('invited','active') order by created_at desc limit 1;
  if found then return g; end if;
  starter := case
    when old.state->>'winner' in ('Lewis','Agnes') then (case when old.state->>'winner' = 'Lewis' then 'Agnes' else 'Lewis' end)
    else (case when old.state->>'starter' = 'Lewis' then 'Agnes' else 'Lewis' end) end;
  insert into public.game_sessions(pair_id, kind, status, state)
  values (old.pair_id, old.kind, 'invited', jsonb_build_object(
    'board', '["","","","","","","","",""]'::jsonb, 'x', starter, 'starter', starter, 'turn', starter,
    'deadline', null, 'winner', null, 'line', null, 'moves', '[]'::jsonb, 'by', s, 'timeouts', 0, 'turn_ms', 10000,
    'round', coalesce((old.state->>'round')::int, 1) + 1))
  returning * into g;
  return g;
end $$;

revoke all on function public.game_start(text), public.game_accept(uuid), public.game_move(uuid,int), public.game_timeout(uuid), public.game_quit(uuid), public.game_rematch(uuid) from public, anon;
grant execute on function public.game_start(text), public.game_accept(uuid), public.game_move(uuid,int), public.game_timeout(uuid), public.game_quit(uuid), public.game_rematch(uuid) to authenticated;

-- ---------- Awards ----------
create table if not exists public.awards (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  side text not null check (side in ('Lewis','Agnes')),
  game text not null default 'tictactoe' check (char_length(game) <= 30),
  code text not null check (char_length(code) <= 40),
  tier text not null default 'bronze' check (tier in ('bronze','silver','gold','diamond')),
  points int not null default 10 check (points between 0 and 10000),
  meta jsonb not null default '{}'::jsonb,
  game_id uuid references public.game_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists awards_once_idx on public.awards(user_id, game, code) where (meta->>'repeat') is null;
create index if not exists awards_pair_idx on public.awards(pair_id, created_at desc);
alter table public.awards enable row level security;
drop policy if exists awards_read on public.awards;
create policy awards_read on public.awards for select using (pair_id in (select public.my_pair_ids()));
drop policy if exists awards_insert on public.awards;
create policy awards_insert on public.awards for insert with check (pair_id in (select public.my_pair_ids()) and user_id = auth.uid() and side = public.my_side());
grant select, insert on public.awards to authenticated;

-- ---------- Realtime ----------
do $$ begin
  begin alter publication supabase_realtime add table public.game_sessions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.awards; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.sealed_letters; exception when duplicate_object then null; end;
end $$;

-- ---------- Clear conversation (Settings) ----------
-- 'me' hides the range on my side only. 'both' hides it on both sides. Rows are kept (nothing is destroyed).
create or replace function public.clear_conversation(p_scope text, p_from timestamptz default null, p_to timestamptz default null)
returns int language plpgsql security definer set search_path = public as $$
declare s text := public.my_side(); n int;
begin
  if s is null then raise exception 'not a member'; end if;
  if p_scope not in ('me','both') then raise exception 'bad scope'; end if;
  update public.messages m
    set deleted_for = (select array(select distinct unnest(m.deleted_for || case when p_scope = 'both' then array['Lewis','Agnes'] else array[s] end)))
    where m.pair_id in (select public.my_pair_ids())
      and (p_from is null or m.created_at >= p_from)
      and (p_to is null or m.created_at < p_to);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.clear_conversation(text, timestamptz, timestamptz) from public, anon;
grant execute on function public.clear_conversation(text, timestamptz, timestamptz) to authenticated;

-- Sign-in scanner: allow the rotating deck and the new scanners.
alter table public.pair_members drop constraint if exists pair_members_lens_check;
alter table public.pair_members add constraint pair_members_lens_check check (lens in ('auto','scan','prism','ripple','orbit','pulse','constellation','bars','ink','aurora','round','small','square','drop','star'));
alter table public.pair_members alter column lens set default 'auto';
