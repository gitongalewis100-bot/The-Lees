-- THE LEES v11.1 - FOLLOW-UP PATCH (optional, tiny, safe to run more than once)
-- Run in the SQL Editor of project "The lees app" (ref emimwlpsfchndxaxzswh), after RUN_THIS_v11.sql.
--
-- WHY: the applied trash_clear() skips messages already marked deleted ("This message was deleted" lines).
-- After "Clear conversation (both sides)" those lines would stay in both chats, so the chat would not be empty.
-- Nothing is lost by removing them: a message deleted with Delete-for-both already has its vault copy
-- (trash_delete_both saved it), and older ones have no content left. The first insert below still only copies
-- messages that are not already deleted, so existing vault copies are never overwritten with empty ones.
--
-- Run this whole file at once. Then run the check at the bottom.

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

-- CHECK (expect: has_tombstone_filter = false, i.e. the delete no longer skips deleted rows)
select position('and not m.deleted' in substring(pg_get_functiondef('public.trash_clear(text,timestamptz,timestamptz)'::regprocedure)
         from position('delete from public.messages' in pg_get_functiondef('public.trash_clear(text,timestamptz,timestamptz)'::regprocedure)))) > 0
       as has_tombstone_filter;
