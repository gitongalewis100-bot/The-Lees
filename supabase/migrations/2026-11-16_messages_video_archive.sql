-- Video messages, per-item archive, and archive_message().
-- Idempotent. Applied on the live project as messages_video_and_archive
-- plus archive_message_rpc.

alter table public.messages drop constraint if exists messages_kind_check;
alter table public.messages
  add constraint messages_kind_check
  check (kind in ('text', 'image', 'audio', 'video'));

alter table public.messages drop constraint if exists messages_audio_path;
alter table public.messages drop constraint if exists messages_media_path;
alter table public.messages
  add constraint messages_media_path
  check (kind not in ('audio', 'video') or media_path is not null);

alter table public.messages
  add column if not exists archived boolean not null default false;

grant update (archived) on public.messages to authenticated;

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

revoke all on function public.archive_message(uuid) from public, anon;
grant execute on function public.archive_message(uuid) to authenticated;
