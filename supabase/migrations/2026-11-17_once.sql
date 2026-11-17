-- The Lees: one-time media. Records that the other person opened a view-once item.
-- Additive and idempotent. Drops nothing. Run after 2026-11-17_features.sql.
-- Rollback: drop function if exists public.mark_opened_once(uuid);

create or replace function public.mark_opened_once(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_side text := public.my_side();
begin
  if v_side is null then
    raise exception 'not a member of this pair';
  end if;
  update public.messages
     set opened_by = array_append(opened_by, v_side)
   where id = p_id
     and once = true
     and pair_id in (select public.my_pair_ids())
     and sender_id <> auth.uid()
     and not (v_side = any(opened_by));
  return found;
end
$$;

revoke all on function public.mark_opened_once(uuid) from public, anon;
grant execute on function public.mark_opened_once(uuid) to authenticated;
