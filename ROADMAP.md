# ROADMAP.md

The plan for agents. Keep it current: move items to Done with the version, add what you find to Known issues.

## Where we are (end of v15, 2026-11-24)
- Live: all of v15 on `main` (pushed from `claude/lees-v15-continuation-m4pvd1`).
- Waiting for the owner: `supabase/RUN_THIS_v15.sql` (see `OWNER_ACTIONS.md`). The app works before it runs
  (fallbacks), but About and ARTEN history only become account-wide after it.

## Done (recent)
- v12: Last seen and Activity, Reset everything, Recently deleted, letters that open on the next launch, the guide, ARTEN.
- v13: ARTEN memory and history, sealed-letter delete, idle warning, online rules, stickers.
- v14: online rule, home tiles, theme sync, Activity page, view-once, ARTEN full screen, Things we know, swipe dismiss, 46 stickers.
- v15: green / blue / red status; glassy theme tiles; Activity by day with 10-day retention and Add note; ARTEN
  zoom, header, pinned greeting, floating composer, thinking state, structured answers, intents, consent-based
  memory with refusals, cited partner facts, chat history, New chat, sign-out memory, chips with actions, Show me
  the steps; About me and [partner]; sealed letter chooser; sticker count and swipe fix; flower rules; premium
  polish; adaptive rendering; composer matching the owner's design with hold to talk; handover documents.

## Next (v16 candidates, in priority order)
1. **Verify on the live site with two signed-in people** once the owner provides `LEES_TEST_PASSPHRASE` (or two
   phones): Online / Last seen / red across devices, Add note delivery, theme sync, stickers on the other side.
2. **Confirm the v15 SQL ran** (owner's check results) and remove the v14 notes fallback in `Items` one version later.
3. **Two-context local harness**: share the stand-in database between two pages (for example through the harness
   server) so two-person flows can be tested before going live.
4. **Letter delete banner**: the v14 "Delete the letters you sent?" banner has three buttons (Cancel, Delete for
   me, Delete for both), against the one-Cancel-one-action rule. Needs the owner's decision because letter flows
   are protected; a two-step version (choose scope, then confirm) would satisfy both.
5. **ARTEN**: the four remaining holdout misses (schedule versus send; photos versus media for "our photos" and
   "gallery"; "love a message"). Write a fresh, unseen holdout before tuning further, because the current one has been inspected.
6. **Polish, phase 2**: lock screen (only with the owner's approval, since sign-in is protected), chat bubbles and
   the chat style studio, Notifications rows, Calendar and Media grids under the same tokens.
7. **Performance**: measure first load on a low-end Android; consider splitting the 6,000-line inline core.
8. **Accessibility pass**: screen-reader labels for tiles and stat tiles, focus order in sheets, live regions.

## Later / ideas (ask the owner first; check the banned-names list in AGENTS.md)
- Offline queue for messages sent with no signal.
- Owner-facing settings for retention length (currently fixed at 10 days).

## Known issues
- Voice note: after sending, the browser logs one `ERR_FILE_NOT_FOUND` for the released recording blob (v14
  behaviour, harmless; seen in `tests/v15-regression-run-2.txt`).
- The flower floats over the bottom-right of long pages mid-scroll (it steps aside while typing, and pages leave
  room under their last row).
- Discovery item d (pressed look on Create and Journal in v14) was not seen on a live device; v15 makes all tiles identical.
- The `v14-baseline` git tag exists only in the v15 session; pushing tags was refused by the proxy.
