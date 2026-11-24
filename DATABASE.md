# DATABASE.md

Supabase project ref `emimwlpsfchndxaxzswh` (eu-west-2). The browser uses the public anon key (in `index.html`);
everything is protected by row-level security tied to the signed-in user and their pair.

## How SQL is handled (always)
1. Agents **never run SQL** and never inspect the live database.
2. All changes for a version go into one file: `supabase/RUN_THIS_vNN.sql`. It must be additive, safe to run twice,
   start with a one-line header, and end with check selects that each return one boolean column named `check`.
3. The owner runs it: Supabase dashboard → SQL Editor → New query → paste the whole file → Run. Then run the check
   selects at the end (or read their results under the main run); every value must be `true`.
4. Record the result in `OWNER_ACTIONS.md` and in this file's table below.

## SQL files and status
| File | What it adds | Status |
|---|---|---|
| `schema.sql` | base schema: pairs, pair_settings, pair_members, messages, notes, scheduled_messages, read_markers, note_reads, recovery_*, journal_entries, notify_log | live (reference copy; may lag the live schema) |
| `migrations/2026-11-16 … 2026-11-19_*.sql` | checkpoints, video and archive, chat lock, features, journal edit, media lock, view-once, letters/games/awards, grants, special days, tagline rotation | recorded as applied live in `CHANGELOG.md` |
| `RUN_THIS_v11.sql`, `RUN_THIS_v11_patch.sql` | message_trash (Recently deleted), trash_list, trash_restore, trash_delete_both, trash_clear | run in v11 |
| `RUN_THIS_v12.sql` | activity_log, notify_batches, messages.batch_id, pair_members.last_seen_at, pair_settings.reset_at, log_activity, touch_last_seen, factory_reset, trash_restore_all, trash_purge_all | run once (CHANGELOG v12) |
| `RUN_THIS_v13.sql` | arten_facts, sealed_hide, a new sealed_envelopes (letter hiding) | run in v13 |
| `RUN_THIS_v14.sql` | arten_notes (about me / about partner), user_prefs (personal theme) | checks recorded true in `tests/baseline.txt` |
| **`RUN_THIS_v15.sql`** | **arten_items (+ copies every arten_notes line), arten_conversations, purge_retained_for_me, purge_retained_all, daily pg_cron at 03:10 UTC** | **NOT RUN YET**: see `OWNER_ACTIONS.md` |

## Tables (public)
- `pairs`, `pair_members` (side, user_id, tz, status, haptics, sound, last_seen_at, lens …), `pair_settings` (theme, archive_days, chat lock, reset_at, …).
- `messages` (kind text/image/video/audio, text, media_path, batch_id, hearts, deleted_for, hidden_for, effect, history, quiet, once_*), `message_trash` (Recently deleted), `scheduled_messages`, `drafts`, `read_markers`, `bookmarks`.
- `notes`, `note_reads`, `journal_entries`.
- `sealed_letters` (author_side, recipient_side, title, body, seal, paper, open_at, opened_at, hidden for each side), `game_sessions` (kind, status invited/active/done, state {by, turn, board}), `awards`.
- `activity_log` (side, at, action, detail): Activity and Last seen.
- `arten_facts` (v13), `arten_notes` (v14, one note per person per subject), **`arten_items` (v15, one row per line: author_side, subject_side, body ≤300, source written/arten, status saved/proposed)**, **`arten_conversations` (v15: user_id, side, title ≤120, messages jsonb ≤200 KB, started_at, archived_at)**.
- `user_prefs` (user_id, theme).
- `check_ins`, `location_shares`, `chat_unlocks`, `chat_unlock_attempts`, `recovery_answers`, `recovery_questions`, `recovery_attempts`.
- `notify_batches`, `notify_log`: Telegram notification plumbing. **Do not touch.**

## Functions (RPCs) the app calls
`my_pair_ids()`, `my_side()`, `public_labels`, `claim_side`, `recovery_prompts`, `unread_count`, `mark_read`,
`mark_read_upto`, `set_reaction`, `set_emoji`, `set_moment`, `set_hidden`, `undo_send`, `delete_for_me`,
`delete_for_both`, `archive_message`, `unarchive_message`, `clear_conversation`, `mark_opened_once`,
`send_scheduled_now`, `cancel_scheduled`, `deliver_due_messages`, `chat_open_for_me`, `unlock_chat`,
`sealed_envelopes`, `open_sealed_letter`, `sealed_hide`, `game_start`, `game_accept`, `game_move`, `game_quit`,
`game_rematch`, `game_timeout`, `trash_list`, `trash_restore`, `trash_restore_all`, `trash_delete_both`,
`trash_clear`, `trash_purge_all`, `factory_reset` (checks the passphrase), `touch_last_seen`, `log_activity`,
and from v15 `purge_retained_for_me` (the app ignores "function missing" until the SQL is run).
`purge_retained_all` is for the scheduler only (no execute for anon or authenticated).

## Edge functions (`supabase/functions/`; never edit)
`notify-message` (Telegram alerts for new messages), `setup-recovery`, `recovery-reset` (passphrase recovery),
`transcribe-voice` (optional transcripts; needs the owner's API key, see README). Hashes are recorded in
`tests/v15-baseline.txt` and must not change.

## Retention (v15)
Activity and ARTEN conversations are kept 10 days. The app hides older days at once; the server deletes them when
`purge_retained_for_me` runs (after sign-in and when Activity opens) and daily at 03:10 UTC through pg_cron. If
pg_cron is not available the file says so with a notice and the app-side purge still works.
