# PROGRESS - release candidate v3

## Round 6 (final)
- [x] Scan-line verification default, Verified hold, Mr/Mrs Lees welcome. Flow test 20 of 20. Boot 0 errors.

## Round 5 (final candidate, v4 final)
- [x] Sign-in art rebuilt (own drawing, pose cycle, reduced motion still).
- [x] Passphrase never shown; lens moves over blinded marks; wrong and right paths tested.
- [x] Lens choice in Settings (per-person, local mirror).
- [x] One account switch; stale picker cards removed.
- [x] Lock-screen type about 1.5x; passphrase field taller.
- [x] Stale code removed: #toBottom, .sides/.side, dup scheduleText, openEffects, effect chip, lp-divider, old loader.
- [x] Cache-bust ?v=9. jsdom boot test: zero errors. Sign-in flow test: 19 of 19.
- [ ] Not verified visually. Owner or Grok must check on a real phone and desktop (see PUBLISH_FOR_GROK.md).

## Round 4
- [x] Boomerang flight replaced with an eased oval, nose on the path (numerically verified).
- [x] One "New messages" divider (duplicate patch divider removed).
- [x] Typing expiry fixed (blink between bursts), stop beat added, home-screen typing text added.
- [x] Cache-bust ?v=8. Boot test (jsdom) zero errors; lock screen content verified.
- [ ] NOT DONE: sign-in chair art, password lens animation, media library type chooser, 1.5x type size. See the report.
- [ ] Owner: real-phone check per DEPLOY.md step (c). Nothing in this round was viewed in a real browser.

- [x] Part 0: base is the functional build.
- [x] Part 1: messaging (typing row in thread, in-place morph, effects after morph, one divider, unread toast removed, duplicate sendText removed; banner, tray, chip and swipe kept).
- [x] Part 2.1 to 2.8: sign-in, loading box, shield, send, media, settings and sign-out, vibration.
- [x] Part 3: database migration (tagline column, journal_entries, media bucket), idempotent and additive.
- [x] Part 7: cache-busting (?v=3), DEPLOY.md, test report, release zip.
- [ ] Owner actions: run the migration on staging, check the live schema, deploy, and check on a real phone (see DEPLOY.md).
