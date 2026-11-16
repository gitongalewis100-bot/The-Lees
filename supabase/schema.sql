-- The Lees schema. Service role only for recovery answers.
-- Browser uses the anon key. No service-role key belongs in this file.

create extension if not exists pgcrypto;
create extension if not exists pg_cron with schema extensions;

-- ---------- tables ----------

create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.pair_settings (
  pair_id uuid primary key references public.pairs(id) on delete cascade,
  theme text not null default 'warm',
  archive_days integer not null default 0 check (archive_days >= 0)
);

create table public.pair_members (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('Lewis', 'Agnes')),
  status text not null default '',
  tz text not null default 'UTC',
  haptics boolean not null default true,
  sound boolean not null default true,
  auto_blur boolean not null default true,
  shake boolean not null default false,
  blur_words text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (pair_id, user_id),
  unique (pair_id, side),
  unique (user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id),
  kind text not null check (kind in ('text', 'image', 'audio', 'video')),
  text text,
  media_path text,
  reply_to jsonb,
  effect text not null default 'none',
  hearts text[] not null default '{}',
  hidden_for text[] not null default '{}',
  deleted_for text[] not null default '{}',
  deleted boolean not null default false,
  moment boolean not null default false,
  history jsonb not null default '[]'::jsonb,
  edited boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  send_at timestamptz,
  delivered_at timestamptz,
  late boolean not null default false,
  no_archive boolean not null default false,
  archived boolean not null default false,
  dur real,
  client_id text unique,
  constraint messages_text_len check (text is null or char_length(text) <= 10000),
  constraint messages_media_path check (kind not in ('audio', 'video') or media_path is not null)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  side text not null check (side in ('Lewis', 'Agnes')),
  kind text not null check (kind in ('gratitude', 'note', 'wish')),
  text text not null check (char_length(text) between 1 and 280),
  edited boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users(id),
  side text not null check (side in ('Lewis', 'Agnes')),
  text text not null check (char_length(text) between 1 and 10000),
  effect text not null default 'none',
  send_at timestamptz not null,
  created_at timestamptz not null default now(),
  cancelled boolean not null default false,
  delivered_at timestamptz,
  client_id text unique
);

create table public.read_markers (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('Lewis', 'Agnes')),
  read_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);

create table public.note_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  primary key (user_id, note_id)
);

-- Hashes only. No policies: the service role is the only reader.
create table public.recovery_answers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt1 text not null,
  hash1 text not null,
  salt2 text not null,
  hash2 text not null,
  created_at timestamptz not null default now()
);

-- Question indexes only, so a signed-out person can be shown their questions.
create table public.recovery_questions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  side text not null unique check (side in ('Lewis', 'Agnes')),
  q1 integer not null check (q1 between 0 and 7),
  q2 integer not null check (q2 between 0 and 7 and q2 <> q1)
);

create table public.recovery_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failure_count integer not null default 0,
  locked_until timestamptz
);

-- ---------- exactly two members ----------

create or replace function public.enforce_two_members()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.pair_members where pair_id = new.pair_id) >= 2 then
    raise exception 'a pair has exactly two members';
  end if;
  return new;
end;
$$;

create trigger pair_members_two
  before insert on public.pair_members
  for each row execute function public.enforce_two_members();

-- ---------- helpers ----------

create or replace function public.my_pair_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select pair_id from public.pair_members where user_id = auth.uid();
$$;

create or replace function public.my_side()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select side from public.pair_members where user_id = auth.uid();
$$;

create or replace function public.claim_side(p_side text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid;
  existing uuid;
  em text;
begin
  if p_side not in ('Lewis', 'Agnes') then
    raise exception 'invalid side';
  end if;
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  select lower(email) into em from auth.users where id = auth.uid();
  if p_side = 'Lewis' and em is distinct from 'lewis@the-lees.app' then
    raise exception 'wrong side';
  end if;
  if p_side = 'Agnes' and em is distinct from 'agnes@the-lees.app' then
    raise exception 'wrong side';
  end if;
  select pair_id into existing from public.pair_members where user_id = auth.uid();
  if existing is not null then
    return existing;
  end if;
  if exists (select 1 from public.pair_members where side = p_side) then
    raise exception 'side taken';
  end if;
  select id into pid from public.pairs order by created_at limit 1;
  if pid is null then
    insert into public.pairs default values returning id into pid;
    insert into public.pair_settings (pair_id) values (pid);
  end if;
  insert into public.pair_members (pair_id, user_id, side) values (pid, auth.uid(), p_side);
  return pid;
end;
$$;

create or replace function public.recovery_prompts(p_side text)
returns table (q1 integer, q2 integer)
language sql
stable
security definer
set search_path = public
as $$
  select q.q1, q.q2
  from public.recovery_questions q
  where q.side = p_side;
$$;

-- ---------- message RPCs (membership checked first) ----------

create or replace function public.set_reaction(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
  m public.messages;
begin
  s := public.my_side();
  if s is null then raise exception 'not a member'; end if;
  select * into m from public.messages
    where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  if s = any (m.hearts) then
    update public.messages set hearts = array_remove(hearts, s) where id = p_id;
  else
    update public.messages set hearts = array_append(hearts, s) where id = p_id;
  end if;
end;
$$;

create or replace function public.set_emoji(p_id uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
  m public.messages;
  token text;
  allowed text[] := array['❤','😂','😮','👍','😢'];
begin
  if not (p_emoji = any (allowed)) then raise exception 'bad emoji'; end if;
  s := public.my_side();
  if s is null then raise exception 'not a member'; end if;
  select * into m from public.messages
    where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  token := s || ':' || p_emoji;
  update public.messages
    set hearts = coalesce((
      select array_agg(x) from unnest(hearts) x
      where x <> all (array[s || ':❤', s || ':😂', s || ':😮', s || ':👍', s || ':😢'])
    ), '{}')
    where id = p_id;
  if not (token = any (m.hearts)) then
    update public.messages set hearts = array_append(hearts, token) where id = p_id;
  end if;
end;
$$;

create or replace function public.set_hidden(p_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
  m public.messages;
begin
  s := public.my_side();
  if s is null then raise exception 'not a member'; end if;
  select * into m from public.messages
    where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  update public.messages
    set hidden_for = case
      when p_on then (select array(select distinct unnest(m.hidden_for || array[s])))
      else array_remove(m.hidden_for, s)
    end
    where id = p_id;
end;
$$;

create or replace function public.set_moment(p_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
begin
  s := public.my_side();
  if s is null then raise exception 'not a member'; end if;
  update public.messages
    set moment = p_on
    where id = p_id and pair_id in (select public.my_pair_ids());
  if not found then raise exception 'not found'; end if;
end;
$$;

create or replace function public.delete_for_me(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s text;
  m public.messages;
begin
  s := public.my_side();
  if s is null then raise exception 'not a member'; end if;
  select * into m from public.messages
    where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  update public.messages
    set deleted_for = (select array(select distinct unnest(m.deleted_for || array[s])))
    where id = p_id;
end;
$$;

create or replace function public.delete_for_both(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.messages;
begin
  if public.my_side() is null then raise exception 'not a member'; end if;
  select * into m from public.messages
    where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  if m.sender_id is distinct from auth.uid() then
    raise exception 'only the sender';
  end if;
  if m.created_at < now() - interval '24 hours' then
    raise exception 'too late';
  end if;
  if m.media_path is not null then
    delete from storage.objects where bucket_id = 'media' and name = m.media_path;
  end if;
  update public.messages
    set deleted = true,
        text = '',
        media_path = null,
        moment = false,
        hidden_for = '{}',
        history = '[]'::jsonb,
        kind = 'text'
    where id = p_id;
end;
$$;

create or replace function public.archive_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.messages;
begin
  if public.my_side() is null then raise exception 'not a member'; end if;
  select * into m from public.messages
    where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  update public.messages set archived = true where id = p_id;
end;
$$;

create or replace function public.cancel_scheduled(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_side() is null then raise exception 'not a member'; end if;
  update public.scheduled_messages
    set cancelled = true
    where id = p_id
      and sender_id = auth.uid()
      and delivered_at is null
      and pair_id in (select public.my_pair_ids());
  if not found then raise exception 'not found'; end if;
end;
$$;

create or replace function public.deliver_due_messages()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with due as (
    update public.scheduled_messages
      set delivered_at = now()
      where cancelled = false
        and delivered_at is null
        and send_at <= now()
      returning *
  )
  insert into public.messages (
    pair_id, sender_id, kind, text, effect, created_at, send_at, delivered_at, late
  )
  select
    pair_id,
    sender_id,
    'text',
    text,
    effect,
    now(),
    send_at,
    now(),
    (extract(epoch from (now() - send_at)) > 120)
  from due;
  get diagnostics n = row_count;
  return n;
end;
$$;

select cron.schedule('deliver-due', '* * * * *', 'select public.deliver_due_messages()');

-- ---------- row security ----------

alter table public.pairs enable row level security;
alter table public.pair_settings enable row level security;
alter table public.pair_members add column if not exists avatar_path text;

alter table public.pair_members enable row level security;
alter table public.messages enable row level security;
alter table public.notes enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.read_markers enable row level security;
alter table public.note_reads enable row level security;
alter table public.recovery_answers enable row level security;
alter table public.recovery_questions enable row level security;
alter table public.recovery_attempts enable row level security;

-- recovery tables: no policies. Service role bypasses RLS.

create policy pairs_read on public.pairs
  for select to authenticated
  using (id in (select public.my_pair_ids()));

create policy settings_read on public.pair_settings
  for select to authenticated
  using (pair_id in (select public.my_pair_ids()));

create policy settings_update on public.pair_settings
  for update to authenticated
  using (pair_id in (select public.my_pair_ids()))
  with check (pair_id in (select public.my_pair_ids()));

create policy members_read on public.pair_members
  for select to authenticated
  using (pair_id in (select public.my_pair_ids()));

create policy members_update_own on public.pair_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sender may update only the text and edit columns. Everything else is an RPC.
create policy messages_read on public.messages
  for select to authenticated
  using (pair_id in (select public.my_pair_ids()));

create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    pair_id in (select public.my_pair_ids())
    and sender_id = auth.uid()
  );

create policy messages_update_text on public.messages
  for update to authenticated
  using (sender_id = auth.uid() and pair_id in (select public.my_pair_ids()))
  with check (sender_id = auth.uid() and pair_id in (select public.my_pair_ids()));

create policy notes_read on public.notes
  for select to authenticated
  using (pair_id in (select public.my_pair_ids()));

create policy notes_insert on public.notes
  for insert to authenticated
  with check (
    pair_id in (select public.my_pair_ids())
    and author_id = auth.uid()
    and side = public.my_side()
  );

create policy notes_update on public.notes
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy notes_delete on public.notes
  for delete to authenticated
  using (author_id = auth.uid());

create policy sched_read on public.scheduled_messages
  for select to authenticated
  using (pair_id in (select public.my_pair_ids()));

create policy sched_insert on public.scheduled_messages
  for insert to authenticated
  with check (
    pair_id in (select public.my_pair_ids())
    and sender_id = auth.uid()
    and side = public.my_side()
  );

create policy reads_all on public.read_markers
  for select to authenticated
  using (pair_id in (select public.my_pair_ids()));

create policy reads_write on public.read_markers
  for insert to authenticated
  with check (user_id = auth.uid() and pair_id in (select public.my_pair_ids()));

create policy reads_update on public.read_markers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy note_reads_read on public.note_reads
  for select to authenticated
  using (user_id = auth.uid());

create policy note_reads_write on public.note_reads
  for insert to authenticated
  with check (user_id = auth.uid());

create policy note_reads_update on public.note_reads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id),
  side text not null check (side in ('Lewis','Agnes')),
  kind text not null check (kind in ('diary','note')),
  text text not null check (char_length(text) between 1 and 10000),
  created_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
create policy journal_read on public.journal_entries for select to authenticated
  using (pair_id in (select public.my_pair_ids()));
create policy journal_insert on public.journal_entries for insert to authenticated
  with check (pair_id in (select public.my_pair_ids()) and author_id = auth.uid()
              and side = public.my_side());
revoke all on public.journal_entries from anon, public;
revoke all on public.journal_entries from authenticated;
grant select, insert on public.journal_entries to authenticated;

-- ---------- privileges ----------

revoke all on public.recovery_answers from public, anon, authenticated;
revoke all on public.recovery_questions from public, anon, authenticated;
revoke all on public.recovery_attempts from public, anon, authenticated;

-- anon has no privilege on the app tables
revoke all on public.messages from anon;
revoke all on public.pair_members from anon;
revoke all on public.read_markers from anon;
revoke all on public.notes from anon;
revoke all on public.note_reads from anon;
revoke all on public.scheduled_messages from anon;
revoke all on public.pair_settings from anon;

grant usage on schema public to authenticated;

grant select on public.pairs to authenticated;
revoke update on public.pair_settings from authenticated;
alter table public.pair_settings add column if not exists app_icon text check (app_icon is null or char_length(app_icon) <= 300000);
alter table public.pair_settings add column if not exists pinned_message_id uuid;
grant update (theme, archive_days) on public.pair_settings to authenticated;
grant update (app_icon, pinned_message_id) on public.pair_settings to authenticated;
grant select on public.pair_members to authenticated;
revoke update on public.pair_members from authenticated;
grant update (status, tz, haptics, sound, auto_blur, shake, blur_words) on public.pair_members to authenticated;
grant update (avatar_path) on public.pair_members to authenticated;
alter table public.pair_members add column if not exists chat_theme text;
alter table public.pair_members add column if not exists chat_style jsonb not null default '{}'::jsonb;
grant update (chat_theme, chat_style) on public.pair_members to authenticated;
revoke all on public.messages from authenticated;
grant select, insert on public.messages to authenticated;
grant update (text, edited, edited_at, history) on public.messages to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert on public.scheduled_messages to authenticated;
revoke insert, update on public.read_markers from authenticated;
grant select on public.read_markers to authenticated;
grant insert (pair_id, user_id, side, read_at) on public.read_markers to authenticated;
grant update (read_at, side) on public.read_markers to authenticated;
grant select, insert, update on public.note_reads to authenticated;

grant execute on function public.my_pair_ids() to authenticated;
grant execute on function public.my_side() to authenticated;
grant execute on function public.claim_side(text) to authenticated;
grant execute on function public.recovery_prompts(text) to anon, authenticated;
grant execute on function public.set_reaction(uuid) to authenticated;
grant execute on function public.set_emoji(uuid, text) to authenticated;
grant execute on function public.set_hidden(uuid, boolean) to authenticated;
grant execute on function public.set_moment(uuid, boolean) to authenticated;
grant execute on function public.delete_for_me(uuid) to authenticated;
grant execute on function public.delete_for_both(uuid) to authenticated;
grant execute on function public.archive_message(uuid) to authenticated;
grant execute on function public.cancel_scheduled(uuid) to authenticated;

create or replace function public.send_scheduled_now(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.scheduled_messages;
begin
  if public.my_side() is null then raise exception 'not a member'; end if;
  update public.scheduled_messages
    set delivered_at = now(), send_at = now()
    where id = p_id
      and sender_id = auth.uid()
      and cancelled = false
      and delivered_at is null
      and pair_id in (select public.my_pair_ids())
    returning * into row;
  if not found then raise exception 'not found'; end if;
  insert into public.messages (
    pair_id, sender_id, kind, text, effect, created_at, send_at, delivered_at, late
  ) values (
    row.pair_id, row.sender_id, 'text', row.text, row.effect, now(), now(), now(), false
  );
end;
$$;

grant execute on function public.send_scheduled_now(uuid) to authenticated;

revoke all on function public.deliver_due_messages() from public, anon, authenticated;

-- ---------- storage ----------

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do update set public = false;

create policy media_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1]::uuid in (select public.my_pair_ids())
  );

create policy media_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1]::uuid in (select public.my_pair_ids())
  );

create policy media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and owner = auth.uid());

-- ---------- realtime ----------

alter table public.messages replica identity full;
alter table public.notes replica identity full;
alter table public.scheduled_messages replica identity full;
alter table public.read_markers replica identity full;
alter table public.pair_settings replica identity full;
alter table public.pair_members replica identity full;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.scheduled_messages;
alter publication supabase_realtime add table public.read_markers;
alter publication supabase_realtime add table public.pair_settings;
alter publication supabase_realtime add table public.journal_entries;
alter publication supabase_realtime add table public.pair_members;

-- Names shown on the lock screen and while signed in.
alter table public.pair_settings add column if not exists label_lewis text not null default 'Mr Lees'
  check (char_length(label_lewis) between 1 and 30);
alter table public.pair_settings add column if not exists label_agnes text not null default 'Mrs Lees'
  check (char_length(label_agnes) between 1 and 30);
grant update (label_lewis, label_agnes) on public.pair_settings to authenticated;

create or replace function public.public_labels()
returns table (side text, label text)
language sql stable security definer set search_path = public as $$
  select 'Lewis'::text, s.label_lewis from public.pair_settings s
  union all
  select 'Agnes'::text, s.label_agnes from public.pair_settings s;
$$;
revoke all on function public.public_labels() from public;
grant execute on function public.public_labels() to anon, authenticated;

create or replace function public.mark_read() returns void
language sql security definer set search_path = public as $$
  insert into public.read_markers (pair_id, user_id, side, read_at)
  select pm.pair_id, pm.user_id, pm.side, now()
  from public.pair_members pm where pm.user_id = auth.uid()
  on conflict (pair_id, user_id) do update set read_at = excluded.read_at;
$$;
revoke all on function public.mark_read() from public;
grant execute on function public.mark_read() to authenticated;

create or replace function public.unread_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer from public.messages m
  join public.pair_members me on me.user_id = auth.uid() and me.pair_id = m.pair_id
  left join public.read_markers r on r.user_id = auth.uid() and r.pair_id = m.pair_id
  where m.sender_id <> auth.uid()
    and m.deleted = false
    and not (me.side = any (m.deleted_for))
    and m.created_at > coalesce(r.read_at, 'epoch'::timestamptz);
$$;
revoke all on function public.unread_count() from public;
grant execute on function public.unread_count() to authenticated;

-- Telegram alerts. No policies: only the service role writes this log.
create table if not exists public.notify_log (
  message_id uuid primary key references public.messages(id) on delete cascade,
  sent_at timestamptz not null default now()
);
alter table public.notify_log enable row level security;
revoke all on public.notify_log from anon, authenticated, public;

