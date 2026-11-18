-- Column grants for the new shared settings (applied live 2026-11-19), and two functions that already existed in
-- the live database but were missing from the repo (recorded as-is).
grant update (taglines, tagline_mode, special_days) on public.pair_settings to authenticated;

create or replace function public.undo_send(p_id uuid)
returns boolean language plpgsql security definer set search_path to 'public' as $function$
begin
  delete from public.messages
   where id = p_id and sender_id = auth.uid() and undo_until is not null and undo_until > now()
     and pair_id in (select public.my_pair_ids());
  return found;
end
$function$;

create or replace function public.unarchive_message(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare m public.messages;
begin
  if public.my_side() is null then raise exception 'not a member'; end if;
  select * into m from public.messages where id = p_id and pair_id in (select public.my_pair_ids());
  if m.id is null then raise exception 'not found'; end if;
  update public.messages set archived = false, no_archive = true where id = p_id;
end;
$function$;
