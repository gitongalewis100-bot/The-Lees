# The Lees v5: changes against the original upload

Files changed: index.html, lees-patch.js, lees-patch.css, supabase/functions/setup-recovery/index.ts, supabase/functions/recovery-reset/index.ts. Added: supabase/migrations/2026-11-18_lens_and_view_once_window.sql (already applied live).

## Database (live, applied and read back)
- pair_members.lens (per-person sign-in object), with SELECT and UPDATE grants.
- messages.once_opened_at, set by mark_opened_once. media_read storage policy: a recipient can read a one-time file only for two minutes after opening it.

## Edge functions (live)
- setup-recovery v6 and recovery-reset v6: answer OPTIONS (CORS preflight). This was the cause of "Could not save recovery". Logic otherwise unchanged.

## Front end
- index.html: "All caught up" removed; automatic home "New message" toasts removed; deleted-for-both messages hidden; view-once gate rebuilt (round button, press handlers no longer swallow it, viewer with 60 s link, never cached); View once and Quiet switches; journal plus button; blurred words manager (openWordManager, termsFor); recording player (heldPlayer, ensureHeldAudio); settings search guard (settingsTyping); lens saved and read from the database.
- lees-patch.js: welcome shows on verify, tap to dismiss, separate blur class; banner hides after 3.2 s; typing expires after 4 s.
- lees-patch.css: scan blur removed; scan colour ink; view-once button, viewer, switches, journal plus, player and receipt pill styles.
- Cache-busting: lees-patch.css?v=22, lees-patch.js?v=12.

## Not changed
Sound preview, staged media preview, double-tap partner notice, duplicate addMedia and mediaURL definitions, schema.sql (stale against live), notify-list-chats (a stub that always returns 401, not called by the app, safe to delete in the dashboard).

## Round 4 (final for this release)
- Database: unread_count() now matches the thread rules (live, applied).
- lees-patch.css: settings sections as cards (`.settings-section`), cache-bust `?v=23`.
- notify-message: unchanged (identical to the original upload).

## Round 5 (built against v5)
- G. Composer: [+] [textarea] [mic] [send]. The + pop-out holds Attach only. Mic is 52 px, same as Send, and pulses while recording (`#mic.recording`, reduced-motion safe).
- H. Recording: mono, 48 kHz, echo cancellation, noise suppression and auto gain on both the permission prime and the recorder; bitrate 64 kbps.
- M. Double-tap like: when the partner adds a heart to one of my messages, a notice shows "Mr Lees liked your message" or "Mrs Lees liked your message" on my device.
- N. Sound preview: resumes the audio context on the tap; if it is still suspended, the button reads "Tap Preview again" for 2.5 s.
- Cache-bust: lees-patch.css?v=24, lees-patch.js?v=13.
- Not in this round: I (transcription), J (media preview and editor), K (undo send), L (thinking-of-you nudge), O badge fix. See the delivery notes.


## v7
- Voice transcription: new edge function supabase/functions/transcribe-voice (not deployed). Client sends the held clip after Done, shows an editable transcript, saves it with the message. Settings > Privacy: "Transcribe my voice notes".
- Media preview: thumbnail above the composer, full-screen preview with caption, View once, Quiet, Send and Remove. Photo rotate, flip, crop, HD export. Video and audio playback and preview mute. Not yet: draw, blur brush, text, stickers, trim.
- Undo send: five-second Undo on sent messages and media (undo_send).
- "Thinking of you" home tile (broadcast, no table, one send per 5 minutes).
- Badge: the unread count comes from the local list only, so it matches the thread.
- Stylesheet cache bust ?v=25. See V7_REPORT.md for checks and owner steps.

## v8 (2026-11-18)
Files: index.html, lees-patch.js, lees-patch.css (unchanged rules, cache-bust), new lees-v8.js, lees-v8.css, sw.js,
supabase/migrations/2026-11-18_letters_games_awards.sql.

- Create (+) tile on home, directly below Archive: Sealed letters, Tic-tac-toe, Trophy cabinet.
- Sealed letters: write, pick the opening date, wax seal and paper. The recipient sees the envelope but the
  database will not return the body before the date (RLS + `open_sealed_letter`). Priority card when one is ready.
- Tic-tac-toe: live, server-validated moves (`game_move`), 10-second clock from the server deadline, turn passes on
  timeout (`game_timeout`), rematch, in-game chat and quick messages that go to the conversation, double-tap to love.
- Awards: 13 medals in bronze/silver/gold/diamond with points and levels, shared cabinet, partner is told.
- Settings rebuilt: 7 categories, persistent centred search with synonyms and typo tolerance, sheets instead of
  dropdowns, confirmations for risky actions. Clear conversation now works (`clear_conversation`). Vibration saves.
- Panels stack: Back returns to the previous panel instead of jumping home. Settings pages don't rebuild under you.
- Sign-in: compact field, no placeholder or eye during the scan, 12 scanners dealt from a shuffled deck (no repeat
  until all have played), faster check, welcome hands straight to home.
- Chat: fixed duplicate bubbles (own message echoed by realtime was appended twice); arrival animation no longer
  locks the bubble size (no clipped text); typing indicator no longer drops 40 ms after each key; constant dot speed;
  full-screen photo/video preview with message and Send; recorder hardened (ideal constraints, fallback, timeslice,
  send-now); voice preview with waveform seek and speed.
- Offline: on-device copy of the data after each sync (paints instantly next sign-in), service worker app shell,
  photo prefetch.

## v9 (2026-11-19)
New files: lees-v9.js, lees-v9.css, supabase/migrations/2026-11-19_tagline_rotation.sql (applied live).
- Rebuilt screens: Notifications (messages, letters, games, nudges, awards, journal in one feed, filters, ready
  letters pinned), Journal (paper pages, search, filters, letter-style composer with prompts and autosave),
  Calendar (activity heat, photo/journal/letter dots, month stats, day detail, "on this day", swipe), Media
  (photo/video grid by month, full-screen viewer with swipe, save, moment, delete; voice list with players),
  Blurred words, Send later, Clear conversation (scope cards, ranges, live count, hold to confirm),
  passphrase change (strength meter; recovery is separate).
- Chat style studio on long-press: theme previews, wallpaper from the device with brightness and blur, bubbles,
  text size, corners.
- Home: six extras in the Settings column: streak, moods, daily question, closeness score, best time to talk,
  on this day.
- One alert pipeline for everything from the other person (toast, sound, buzz, feed, system notification in the
  background), respecting mute and Quiet. Premium toasts.
- Thinking of you: full-screen heartbeat, hearts, heartbeat buzz, "Send one back".
- Chat: several photos/videos per send, attach opens the picker directly, photo and video cards with overlay time,
  captions shown, new voice card (real waveform, progress ring, seek, speed, transcript), built-in animated stickers
  and emoji picker, on-device live transcription with review, view once enforced by the server answer and
  protected viewer, 10-minute auto sign-out.
- Letters can be edited while sealed; tic-tac-toe "Not now" declines and tells the inviter.
- Lock-screen lines: one line or several that take turns.

## v9.1 (2026-11-19)
- The + menu is a small two-step menu: Attach (then Photos & videos, Take a photo, Record a video, Audio file),
  Draw, Stickers & emoji, Send later. Draw moved here from the message long-press menu.
- Draw rebuilt as a card laid over the chat: see-through, paper, white, night, colours, grid or lined card; pen,
  marker, highlighter, arrow, text, paint bucket and eraser; size, glow, any colour, undo and redo; Add space grows
  the card and slides the new room into view. A see-through drawing floats in the chat; a card is sent whole,
  trimmed to what was used.
- Draw speed: finished ink is kept as a bitmap; each frame draws only the stroke in progress, once per screen
  refresh (measured 16.7 ms per frame with 40 strokes and a fill). Pen pressure changes line thickness. The card
  colour sits behind the ink, so the eraser removes only ink. Undo removes the last stroke.

## v9.2
- Stickers never fall under word blurring (the recipient saw the raw "[[sticker:…]]" text).
- Emoji picker stays open, shows what you've picked, with Delete and Send.
- Chat wallpaper is kept as a compressed image on the device, so it no longer disappears.
- Voice notes record as MP4/AAC where the browser can (plays on iPhone, Android and laptops); playback retries
  with a fresh link and explains clips this device can't play.
- Home: the tool grid can no longer push past the screen; tiles stack icon over name on phones; the six extras use
  line icons.
- Laptops (not Apple devices): emoji show as modern artwork (Twemoji via jsDelivr; CSP img-src updated).

## v10 (2026-11-19)
New: lees-v10.js; migrations 2026-11-19_special_days.sql, 2026-11-19_grants_and_existing_rpcs.sql (applied live).
- Swipe right on a message to reply; tap a quoted reply to jump to the original.
- Fixed: the reply bar was always invisible (a leftover "hidden" class), so you couldn't see what you were replying to.
- Our special days: anniversary, birthdays, firsts, trips; shared; countdown hero, calendar marks, a reminder the
  day before and a celebration on the day. Settings → Letters, games & awards, and from the Calendar.
- Fixed from a full audit: lock-screen lines and special days now save for both (column grants); journal pages are
  never lost on a failed save; no duplicate bubble for stickers/answers; stickers can't inherit a staged reply;
  Clear conversation uses local dates; Mark all read also marks messages seen; camera mode no longer sticks;
  choice sheets and confirmations sit above viewers and the studio; Escape never acts behind an overlay; studio and
  video viewer close with Escape; lines preview stops when you leave; emoji artwork is CORS-clean, observed less
  often and never retried after failing; CSP allows data:/blob: fetches (backup restore, photo save, waveforms);
  the service worker only caches good pages.

## v11 (2026-11-19)
New: lees-v11.js, lees-v11.css, fonts/ (Noto Color Emoji, SIL OFL). No database change.
- Hover lift (desktop) on the six tiles under Settings on home, and on every settings card.
- Recording a voice note shows on the other side like typing: a red mic bubble in the thread, "is recording a voice
  note" on the home line, the tray and the banner. It clears the moment recording stops.
- The typing/recording banner now shows on Settings and every other panel (a narrower pill so Back stays usable),
  not only on home. Member changes that arrive while a settings field has focus are applied right after.
- Game mode now lives inside the real conversation: the board docks above the thread on phones (collapsible) and
  beside it on wide screens. Typing and recording bubbles, banners, mic, attachments, draw, stickers, replies and
  reactions all work while playing. Quick replies are six one-tap chips. Leave and Trophies are header icons.
- Emoji on Windows/Android/Linux use Google's Noto Color Emoji font, self-hosted and split by range, so text,
  inputs, notices and games all match (replaces the Twemoji image swap; no third-party request).
- Shared mood reaches the partner at once (live broadcast + saved row) with a "is feeling …" notice.
- Photos sent together show as one album card (up to four tiles, +N for the rest); each still counts and notifies
  on its own. Tapping opens the set, where each photo can be loved, replied to, forwarded, shared or saved; Forward
  all and Save all for the set. The photo viewer gained Love, Reply and Forward.
- Forwarding: long-press any message (text, photo, voice note, video) → Forward: send it again into the chat
  (marked Forwarded; media is copied), share to another app, save, or copy.
- "Mrs Lees liked your photo / reacted 😂 to your message" notices: shown once per reaction, whether it arrives
  live or with the next sync, with Show to jump to it.
- Listen once: voice notes sent once read "Listen once", play inside their bubble with pause and progress, and read
  "Played" when they finish (no full-screen viewer).
- Fixed: Back then quickly opening another screen could leave a blank screen (a stale transition timer hid it).

## v11.1 (2026-11-19)
New: lees-emoji.js, emoji/ (Microsoft Fluent 3D emoji, MIT), supabase/migrations/2026-11-19_v11_trash_vault.sql.
- One emoji look on every device: every emoji in the app (messages, reactions, stickers, picker, notices, banners,
  games, mood, awards) is drawn with self-hosted 3D artwork, the same on iPhone, Android and old laptops. The real
  character stays underneath (copy, search, screen readers); if an image can't load, the device's emoji shows.
  Text boxes keep the device's emoji while typing (browsers can't put images in a text box).
- Home: the Settings name and icon sit in their own card (lifts on hover).
- Delete for both and Clear conversation (both sides) now really remove messages (needs the SQL file), and every
  removed message is kept in a shared vault. Recently deleted is hidden: Settings → tap "The Lees · private to the
  two of you" five times (or hold it). Both of you see the same vault; Restore puts a message back.
- Sealed letters, game challenges and Thinking of you now arrive as messages: a card in the chat, notified through
  the message pipeline (letter: "sealed a letter for you" with See it). Tapping the card opens the letter (or says
  when it opens), the game, or sends love back.
- Fixed (silent): conversations over 1,000 messages lost their newest messages (Supabase's per-request cap); the
  thread now loads in pages. A part that fails to load (notes, journal, receipts…) keeps its last data instead of
  going blank, and is logged. A failed read-receipt save retries.
- Mood tile shows the full name ("Mrs Lees' mood").
