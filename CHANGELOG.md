# CHANGELOG (release candidate v3, cumulative)

Base: The-Lees-main__2__1.zip (functional build, boots with zero errors).

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
