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
