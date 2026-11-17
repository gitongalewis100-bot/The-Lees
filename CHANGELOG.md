# CHANGELOG (release candidate v3, cumulative)

Base: The-Lees-main__2__1.zip (functional build, boots with zero errors).

## Round 7 (build from owner brief, cache-bust lees-patch.css?v=20)
Live database (project emimwlpsfchndxaxzswh) checked before editing. Already live: all migrations through undo_send, the per-person chat lock (chat_locks, chat_unlocks, unlock_chat, chat_lock_salt, chat_open_for_me), and the new feature columns.
- Database: media_read storage policy now follows the message lock. Files tied to a message are readable only when that chat is open to the caller. Unreferenced files keep the old rule. Migration: supabase/migrations/2026-11-17_media_lock.sql (rollback block included). Applied and read back.
- Edge function notify-message (deployed version 4, verify_jwt false): quiet messages send no alert. If the recipient has a chat lock, the alert text is "New message" with no sender name. Deploy read back.
- NOT SENT: a send that fails on the server and goes to the outbox now shows NOT SENT in red. Tapping it retries the outbox.
- Drafts: unsent text is also saved to the drafts table (one per chat per person), and loads back on a new device. A "Draft" label shows on the conversation card when there is unsent text.
- Voice notes: the playback speed (1x, 1.5x, 2x) is remembered per voice note on this device.
- Read receipts: the Settings toggle already existed and already drives SEEN/DELIVERED. No change.
- Sticky date marker: already present (.day is sticky in lees-patch.css). No change.

Open questions (not built):
- Ghost Mode: the brief says a shield long press toggles ghost mode. No ghost mode exists in the code and the brief does not say what it hides. Needs a decision.
- Home layout from the reference image: the image was not in the upload. Not built.
- Settings sections and search, Archive passphrase gate, Recently deleted as its own tile: not built.
- Keep media out of gallery: the save/download path for media was not located. Not built.
- Speed on the server (messages.speed_pref): not written. Stored on this device only.
- Voice transcripts: browser speech recognition handles one language at a time. Kiswahili and English mixed in one sentence will not transcribe reliably. Not changed.
- Repo gap: the per-person chat lock migration applied live is not saved as a file in supabase/migrations. Save it from the live definitions before the next release.

## Round 6 (final, cache-bust ?v=10)
- Verification effect changed. The default is now a thin scan line that crosses the blinded marks; each mark lights up as the line passes and settles in the accent colour. A small mono status line reads "Verifying", then "Verified" when the scan completes.
- The Verified state holds for about half a second before the welcome, so the scan, the confetti, and the welcome read as one sequence.
- Welcome text is "Welcome, Mr Lees" or "Welcome, Mrs Lees" (from the account name), followed by the existing confetti.
- The lens shapes stay as alternatives in Settings > Sign-in object. Default is "Scan line (recommended)".
- Wrong passphrase: the scan stops at once, blur clears, no welcome.
- Files: lees-patch.js (runScan, lensKind default, Verified hold), lees-patch.css (.lp-beam, .lp-status, lit and seen marks), index.html (DEF.lens "scan", settings choice, cache-bust v=10).

## Round 5 (final candidate, cache-bust ?v=9)
Changed files: index.html, lees-patch.js, lees-patch.css, CHANGELOG.md, PROGRESS.md, DEPLOY.md, test-report.md, PUBLISH_FOR_GROK.md, SHA256SUMS.txt. No database change. No edge functions, icons, manifest, or vercel.json touched.

### Sign-in (Override 3)
- New sign-in art, drawn in this build (the reference image was not supplied): silver monoline, a wooden chair seen from behind, two people seated upright and close, backs of heads, hands, and stars with sparkles. The old two-figure art is removed.
- Pose cycle (14 s, CSS keyframes, ease-in-out): rest, left points up, rest, right points up, rest, both point, rest. Heads tilt slightly up with each gesture. Reduced motion shows the still seated pair.
- Passphrase is never shown. The old wavy-letter box (lp-word / lp-ch / lp-wave / lp-jerk) is removed.
- New password check: the field turns to blinded marks (one bullet per character). A lens moves across them in order, magnifying each mark as it passes, then settles. Wrong password: lens ends, blur clears, no welcome. Right password: the lens finishes, then the welcome and confetti.
- The lock blurs during the check and the art dims. Nothing of the app shows before success.
- Lens choice (Settings, "Sign-in object"): round, small, square, drop, or star. Saved in per-person settings (DEF.lens, default "round") and mirrored to localStorage "pp-lens" so the lock screen can read it before sign-in.

### Lock screen and type size (Override 6)
- One account switch (#acctSwitch) sits above the form and stays on screen, replacing the duplicate picker cards (.sides).
- Account labels 25 px (was 17). Passphrase field 30 px, min-height 84 px (was 20 px / 64 px). Open button 22 px. Subtitle 19 px. Forgot link 17 px. Applied to the lock screen only.
- Avatars, View, Newest, and dot sizes from section A are unchanged.
- The five-minute inactivity warning under the password is not in this build. Nothing to remove.

### Stale code removed (replaced but still present)
- #toBottom button (markup, CSS, .latest-bob animation, placeLatest, every JS reference). The floating tray is the only "newest" control. The tray now calls window.LeesUI.jumpLatest(), which is index.html's scrollBottom + markRead.
- Old picker cards: .sides and .side rules and markup.
- Duplicate scheduleText (the first definition was overridden by the later one at run time).
- openEffects (no callers) and the effect chip (#effectChip, .effectchip) with its effectChoice variable. Plain sends now use fx = "none". Effects still exist inside the Send-later picker.
- Patch: lp-divider (CSS and no-op functions ensureDivider / clearDivider), latestBtn, the MutationObserver on the old button, and the old loader (buildLoader, clearLoader, escCh, loadEl).
- Old CSS: .lp-box, .lp-ch, .lp-word, .lp-loader, .lp-wave, .lp-join, .lp-jerk, .lp-zoom keyframes (lpIn, lpWave, lpJoin, lpJerk, lpInBox), old figure selectors.

### Boomerang (Override 2) and typing (Override 4), from round 4
- Unchanged this round. See round 4 entries below.

### Cache-bust
- index.html loads lees-patch.css?v=9 and lees-patch.js?v=9.

### Defaults chosen (Part 5)
- Lens: 1.6 s minimum (900 ms, 170 ms per mark), ease-in-out per mark, mark magnify 340 ms.
- Lens default shape: round.
- Art: 14 s pose cycle; the chair and people are drawn in this build, not traced from IMG_1371.jpg.
- Lock type scale: 1.5 times on the lock screen only.

## Round 4 (this build, cache-bust ?v=8)
Changed files: index.html, lees-patch.js, lees-patch.css, CHANGELOG.md, PROGRESS.md, DEPLOY.md, test-report.md.
No database change in this round. The migration from v3 is unchanged.

- lees-patch.js: boomerang flight rewritten. The old sampled Bezier loop ran on linear easing (the "dragged mouse" look). New boomerangKeys(R=30, k=1.6, N=72) traces an oval that starts and ends on the send button, with the nose on the direction of travel, one full turn, and a smoothstep speed curve over 1.5 s. Verified numerically in tests/boomerang_path.js.
- lees-patch.js: ensureDivider() no longer creates the patch's second "New messages" divider (.lp-divider). index.html's .newline is now the only divider.
- lees-patch.css: removed the three unused .lp-divider rules.
- index.html, typing signal: the receiver's expiry was 700 ms, but the sender re-sends typing at most every 900 ms, so the outside-chat indicators blinked off between bursts. Expiry is now 1400 ms. On "stopped typing" the indicator gets a 500 ms beat instead of clearing on the same event.
- index.html, TYPING_GRACE_MS (thread bubble hide delay): 1600 ms to 900 ms, so the bubble lingers briefly without holding a stale dot row.
- index.html, home screen: renderPresence() writes "<Name> is typing" with mini dots into #homeSub (under the title) while the partner types, and clears it after. The home screen has no partner row in this build, so #homeSub is the closest existing element. Interpretation, see the report.
- index.html: cache-bust ?v=7 to ?v=8 on lees-patch.css and lees-patch.js.

Default choices made here (Part 5):
- Typing expiry 1400 ms (send throttle 900 ms + margin). Stop beat 500 ms. Thread grace 900 ms.
- Boomerang oval R=30, k=1.6, 1500 ms.
- Home typing uses #homeSub, not a new row.

## Sign-in (Parts 2.1 to 2.3)
- Removed the notebook icon, the "Notes" heading, and the "Welcome back" text (both writes).
- Tagline reads "Do what you love, love what you do." It is shared and editable from Settings (see Database).
- Silver monoline string art from the reference image: two figures close and reopen on a 4 s loop. Reduced motion shows a still frame.
- Password check: the string art and the lock screen blur while checking; both clear on success or failure.
- Loading box: "Checking" letters wave for two turns (1.5 s each) while the box grows and the lock blurs. The welcome appears only after the two turns. A failed check removes the box at once and never shows the welcome.
- Welcome screen: rise-in entry, serif title, about 2 s hold, then fades. Confetti kept.

## Shield (Part 2.4)
- Both shield buttons block the copy menu (contextmenu), text selection (selectstart) and dragging. The long press still turns ghost mode on and off.

## Send (Part 2.5)
- The boomerang reads the same storage key the app writes ("pp-last-side"), so it fires.
- The boomerang also fires for Enter-key sends.
- Removed the patch's 450 ms schedule long press. The app's 500 ms Effects hold stays. Schedule remains in the + menu.

## Media (Part 2.6)
- Media tile after Shield in the home grid, with the same hover-float class.
- Media panel lists the photos and voice notes in the conversation, newest first.

## Settings and sign-out (Part 2.7)
- Settings label inline with its icon and centred.
- Settings box stretches to the height of the tool grid (no fixed 220 px minimum).
- Sign-out in its own red block (#e0463c, white text).

## Vibration (Part 2.8)
- Vibration switch under Haptics, defaults to on.
- Arrival vibration follows only the Vibration switch. Action haptics follow Haptics. Sound is unchanged.

## Messaging (Part 1)
- Typing bubble is inside the thread on the partner's side. The old fixed element near the bottom is removed.
- The typing row stays for 1.6 s after typing stops, so a message arriving just after can morph out of it.
- Morph (approved timings): zoom to 1.14 over 240 ms with the dots fading; the bubble reshapes from the dots' size to the message size over 470 ms; settle bounce 600 ms; the words wave in one by one (70 ms apart).
- Effects run after the morph, never during it.
- Several arrivals morph one after another, never overlapping.
- Chat closed during a morph: the final state is shown at once and effects run.
- Reduced motion: no morph, final state only.
- One "New messages" divider, with gradient rules. The patch's second divider is removed.
- The "N unread messages / Jump" toast is removed. The banner and tray are the only unread notices. "All caught up" is kept.
- The old Latest button stays hidden; the tray replaces it.
- Duplicate sendText removed. The later definition was already the only one running.
- Banner: View is hidden while the partner is typing (existing behaviour, unchanged).
- Tray: the count sits inside the Newest pill (existing behaviour, unchanged).
- Keyboard: End jumps to newest. Escape is not added.

## Database (Part 3)
- supabase/migrations/2026-11-16_checkpoint3.sql (additive, idempotent, drops nothing):
  - pair_settings.tagline (text, 1 to 80 characters, default "Do what you love, love what you do.") and the update grant for it.
  - journal_entries table (used by the app, missing from schema.sql), with RLS: members read their pair; inserts must be for the pair and the caller's own side.
  - storage bucket "media" (private), created only if missing. Existing storage policies are not changed.

## Cache busting
- index.html loads /lees-patch.css?v=3 and /lees-patch.js?v=3, so returning visitors get the new files.

## Not built, by decision
- Chats tab and its badge, Settings tab from the mockup, Do-not-disturb, Sounds and Typing-in-chats switches, Mark all read, the Blush/Dusk/Moss themes, the mockup's home list, and test controls.
- Escape shortcut for the chat.

## Known deviations from the mockup (please confirm)
- The morph animates the message's own bubble from the dots' position and size. It does not reuse the typing element itself, because the message's long-press and action handlers are bound to the message element.
- Swipe-up to dismiss on the banner and tray is kept from the earlier brief. The mockup doesn't have it.

## Known issues left in place (not in scope)
- mediaURL is defined twice in index.html; the later definition runs. Consolidating them is a cleanup task.

## 2026-11-17 step 1 (sign-in switch)
- Account chooser is now a smaller rounded horizontal switch. The knob slides across in 0.6s when you tap either side. Sign-in logic is unchanged.
- Cache-busting: lees-patch.css?v=11.
- Database: supabase/migrations/2026-11-17_features.sql (already applied to the live project). Additive and idempotent.

## 2026-11-17 step 1b (home tiles)
- Long press a home tile (about 0.5s) to enter edit mode. Tiles jiggle and can be dragged to a new place. Tapping outside the tile grid cancels edit mode. There is no Done button.
- The new order is saved on this device (key pp-home-order).
- The coming-soon control in the live slot is removed. Notifications is now a tile in the home grid, with an unread count, and opens a notifications panel.
- Not in this step: resizing tiles, the layout matching the reference image exactly, shield long-press ghost mode from the home grid, and editing from Settings.
- Cache-busting: lees-patch.css?v=12.

## 2026-11-17 step 1c (home tile resize)
- In edit mode, resize a tile by pinching it on a phone (two fingers) or holding Ctrl and scrolling on a laptop. Sizes: small, wide, tall, large. Each step is one size, so a pinch never jumps several sizes.
- Sizes are saved on this device (key pp-home-sizes), alongside the saved order.
- Cache-busting: lees-patch.css?v=13.

## 2026-11-17 step 2a (chat: receipts, unread counter, glass blur)
- Receipts on your own messages show a coloured dot with a label: grey SENT, blue DELIVERED, green SEEN with time. Red NOT SENT is wired to a message flag named failed; the app does not set that flag yet, so red will not appear until send-failure handling sets it.
- Unread messages from the other person count down as they pass an invisible line 40% down the chat. The Newest tray count updates with it. Reaching the bottom still marks everything read on the server, as before.
- Unread messages below the line show a glass blur. Read messages never blur again when you scroll back up.
- Not in this step: the read-receipts setting (pair_members.read_receipts) is not read by the app yet, so seen badges still show for everyone.
- Cache-busting: lees-patch.css?v=14.

## 2026-11-17 step 2b (composer: options before send, view once)
- Attach: a picked photo, video or audio file is staged above the composer. It does not send by itself. Add text if you want, then tap Send.
- Voice notes and staged files share one options bar with View once and Quiet toggles, and a Remove button. The options apply to the next send and reset afterwards.
- View once: a received one-time photo, video or audio shows a "tap to open" gate. Opening it records the opening (messages.opened_by) and shows the item. After a refresh it shows "already opened" instead.
- Database: supabase/migrations/2026-11-17_once.sql adds mark_opened_once(uuid). Applied to the live project and checked: security definer, runnable by signed-in members only.
- Known limits in this step: (1) Quiet only stores the flag. The receiving side does not yet suppress sound or banners. (2) View once is enforced in the app. The media file is still in storage, so it is not hidden from someone who has a direct link. (3) Picking several files at once stages only the last one.
- Cache-busting: lees-patch.css?v=15.

## 2026-11-17 step 2c (notifications tabs, chat lock)
- Notifications panel has All, Unread and Messages tabs. Each row shows the sender and the message, marked "new" when it is unread. Tapping a row opens the chat.
- Chat lock: long press the conversation card on home, then choose Lock with my passphrase, Lock with a new password, or Remove the lock. Removing or changing a lock asks for your passphrase first.
- Locked chats ask for the passphrase (or the chat password) before opening. The lock state is read from Supabase (pair_settings chat_lock_mode, chat_lock_salt, chat_lock_hash) each time a chat opens. If that check fails, the chat stays shut.
- Only a salted hash is stored. The passphrase is never stored.
- Known limits in this step: (1) The lock is enforced in the app, not in the database. Someone reading the database directly, or using the API with the anon key, can still read messages. Enforcing it in the database needs a separate change to the messages read policy. (2) Locked chats do not yet hide previews in notifications. (3) Lock icon on the card is not shown yet.
- Cache-busting: lees-patch.css?v=16.

## 2026-11-17 step 2d (chat lock enforced in the database)
- Database (live project, applied and tested with a rolled-back test): messages_read now returns messages only while the chat is open to the caller. Tested: 159 visible before lock, 0 while locked, wrong password refused, right password accepted, 159 visible again after unlock. Lock is off on live data, so nothing changed for you.
- New tables: chat_unlocks (30-minute unlock per person), chat_unlock_attempts (rate limit: ten failed tries in ten minutes).
- New functions: chat_open_for_me, unlock_chat (both security definer, signed-in members only).
- App: unlocking calls unlock_chat on the server, then reloads messages. Wrong passwords and rate limits show a message.
- Lock options now: shared chat password, or remove the lock (needs the chat password). The per-person passphrase lock is removed until it is designed properly.
- Not done: notifications for locked chats do not yet hide the sender (notify-message edge function unchanged); storage media links are not yet locked down.
- Cache-busting: lees-patch.css?v=16.

## 2026-11-17 step 3a (sign-out banner)
- Sign-out now shows a centred banner with exactly one Cancel and one Sign out. Escape or a tap outside cancels. It replaces the bottom panel.
- Cache-busting: lees-patch.css?v=17.

## 2026-11-17 step 3b (settings search)
- Settings has a search field at the top. It hides any section or row whose text does not match.
- Not in this step: regrouping into Account, Privacy, Notifications, Data and Features sections; editable features grid in Settings.

## 2026-11-17 step 3c (settings sections)
- Settings is regrouped into Account, Privacy, Notifications, Data and Features. Existing rows are moved, not changed. Each control does what it did before.
- Features section is present but empty. The features grid is not in Settings yet.
- Cache-busting: lees-patch.css?v=18.

## 2026-11-17 step 4 (quiet send, mute with timer, read receipts, date marker)
- Quiet send: a message sent with Quiet on does not play a sound or buzz on the other phone.
- Mute notifications (Settings › Notifications): 8 hours, 1 week, or off. Stored on your member row (pair_members.muted_until). While muted, sound and buzz are silent.
- Let her see when I've read (Settings › Privacy): stored on your member row (pair_members.read_receipts). When it is off, her messages show DELIVERED instead of SEEN on your side. Your own seen badges follow her setting in the same way.
- Date marker: the day label stays at the top while you scroll.
- Not in this step: Undo send, the red NOT SENT badge, and receiver-side notifications for quiet messages (banners).
- Cache-busting: lees-patch.css?v=19.
