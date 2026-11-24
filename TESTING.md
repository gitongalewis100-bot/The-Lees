# TESTING.md

## Labels (use exactly these)
PASS (real browser run with a screenshot) · FAIL · PARTIAL · NOT RUN (with the reason) · SOURCE-ONLY (read, not run).
Anything run against the local harness must say **(local, stand-in backend)**.

## Local harness (`tests/harness/`)
- `node tests/harness/server.js` serves the repository at http://localhost:5173 and swaps the Supabase CDN script for
  `fake-supabase.js`, an in-memory database with stub RPCs and realtime events. Helpers in the page:
  `__fake.DB` (tables), `__fake.partnerSend({kind, text, media_path, batch_id})`, `__fake.presence(true|false)`,
  `__fake.emit(table, type, row)`.
- `node tests/harness/drive.js tests/harness/s/<scenario>.js` runs one scenario in Chromium at 390x844.
  `DESK=1` for desktop (1280x860), `DARK=1` for a dark colour scheme, `FAKEMIC=1` for Chromium's fake microphone.
  The helper `signIn()` uses the passphrase `test` (stand-in only).
- Screenshots go to `tests/harness/shots/<scenario>/` (git-ignored). Copy the ones you cite into
  `tests/screenshots/vNN/`.
- If `require('playwright')` fails because NODE_PATH was overridden, set
  `NODE_PATH=$(dirname $(dirname $(node -p "require.resolve('playwright')")))`.

## Scenarios
| Scenario | Covers |
|---|---|
| `v15full.js` | the 62 v15 acceptance checks (Activity, flower, stickers, swipe, zoom frames, greeting, thinking, overlap at two sizes, citations, proposals and refusals, chips, steps, New chat, history, sign-out memory, About page, chooser) |
| `reg15.js` | sign-in (wrong and right passphrase), journal create/edit/delete, send and jump to newest, sticker send and receive, Recently deleted restore, idle banner and Cancel |
| `reg15b.js` | letters open / delete for me / delete for both, tic-tac-toe move, voice note (`FAKEMIC=1`) |
| `flows.js` | lock screen, presence, Activity, Settings, Recently deleted, Reset everything (wrong then right passphrase) |
| `recv.js`, `media.js` | receiving batches and unread counts; media rows |
| `theme.js` | theme preview, Keep, restore from user_prefs after sign-in |
| `contrast.js` | pixel-sampled contrast of tiles and status colours in three themes (`PERF=low` for the low tier); writes `tests/v15-contrast-*.json` (needs `pngjs`) |
| `tour.js` | screenshots of every main screen (`THEME=warm|ink|sage`, `PERF=low`, `DESK=1`) |
| `composer.js` | the chat composer and ARTEN box against the owner's screenshot; hold to talk, slide to discard, tap still works (`FAKEMIC=1`) |
| `flowertype.js` | the flower steps aside while typing in a page field |
| `v15.js`, `arten.js`, `smoke15.js`, `explore.js` | quick checks and selector discovery |

## ARTEN tests (Node, no browser)
- `node tests/arten-holdout.test.cjs [--misses] [--answers]`: 150 questions in four groups (`tests/arten-holdout.json`). Baseline 78/150, v15 146/150.
- `node tests/arten-v13.test.cjs`: 100-question regression set (`tests/arten-questions.json`, do not edit). v15: 99/100.
- `node tests/arten-personal.test.cjs`: v14 personal-answer checks. 14/14.

## Regression list (run after any fix)
Sign-in and lock · Telegram (owner confirms) · journal create/edit/delete · send text, photos as one batch, voice
note, sticker · sealed letters create/send/open/delete for me/delete for both · idle sign-out (5 minutes, 30-second
banner) · Settings and Reset everything (passphrase) · chat opens where left off; sending jumps to newest · Recently
deleted and restore · tic-tac-toe one move.

## Live checks
Without a test passphrase only the lock screen can be checked live (console, scripts served, screenshot). With
`LEES_TEST_PASSPHRASE` set in the environment, sign in once inside Playwright, save storage to
`tests/.auth/state.json` (git-ignored) and never print the value.
