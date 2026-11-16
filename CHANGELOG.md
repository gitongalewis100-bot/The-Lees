# CHANGELOG (release candidate v3, cumulative)

Base: The-Lees-main__2__1.zip (functional build, boots with zero errors).

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
