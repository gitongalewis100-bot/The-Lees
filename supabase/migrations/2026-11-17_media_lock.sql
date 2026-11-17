-- The Lees: media in a locked chat is readable only through an unlocked chat.
-- Additive and idempotent. Drops no data. Replaces one storage policy (media_read).
-- Files referenced by a message follow that message's lock (chat_open_for_me).
-- Files not referenced by any message keep the old pair-membership rule.
-- Run after the chat-lock migrations (2026-11-17_chat_lock_enforce.sql and the per-person lock).
-- Rollback (restores the previous rule):
--   drop policy if exists media_read on storage.objects;
--   create policy media_read on storage.objects for select to authenticated
--     using (bucket_id = 'media' and ((storage.foldername(name))[1])::uuid in (select public.my_pair_ids()));

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and ((storage.foldername(name))[1])::uuid in (select public.my_pair_ids())
    and (
      not exists (select 1 from public.messages m where m.media_path = name)
      or exists (
        select 1 from public.messages m
         where m.media_path = name
           and m.pair_id in (select public.my_pair_ids())
           and public.chat_open_for_me(m.pair_id)
      )
    )
  );
