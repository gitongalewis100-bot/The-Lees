-- The Lees: journal entries can be edited and deleted by their author, and read position
-- moves only as far as the reader has actually passed.
-- Idempotent. Drops no data. Run after 2026-11-17_restore_and_delete.sql.
-- Rollback: drop policy journal_update / journal_delete on public.journal_entries;
--           revoke update, delete on public.journal_entries from authenticated;
--           drop function if exists public.mark_read_upto(timestamptz);

alter table public.journal_entries add column if not exists edited_at timestamptz;

grant update (text, kind, edited_at), delete on public.journal_entries to authenticated;

drop policy if exists journal_update on public.journal_entries;
create policy journal_update on public.journal_entries for update to authenticated
  using (author_id = auth.uid() and pair_id in (select public.my_pair_ids()))
  with check (author_id = auth.uid() and pair_id in (select public.my_pair_ids()) and side = public.my_side());

drop policy if exists journal_delete on public.journal_entries;
create policy journal_delete on public.journal_entries for delete to authenticated
  using (author_id = auth.uid() and pair_id in (select public.my_pair_ids()));

create or replace function public.mark_read_upto(p_at timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.my_side() is null then raise exception 'not a member'; end if;
  insert into public.read_markers (pair_id, user_id, side, read_at)
  select pm.pair_id, pm.user_id, pm.side, least(p_at, now())
  from public.pair_members pm where pm.user_id = auth.uid()
  on conflict (pair_id, user_id) do update
    set read_at = greatest(coalesce(public.read_markers.read_at, 'epoch'::timestamptz), excluded.read_at);
end;
$$;

revoke all on function public.mark_read_upto(timestamptz) from public, anon;
grant execute on function public.mark_read_upto(timestamptz) to authenticated;
