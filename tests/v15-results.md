# v15 results

Environment: Playwright Chromium, 390x844 unless stated. "Local" means the in-memory Supabase stand-in
(`tests/harness/`), never the live database. LEES_TEST_PASSPHRASE was not set, so nothing behind sign-in was run on
the live site (section 1.2). No SQL was run. Raw logs: `tests/v15-local-run.txt` (62 checks),
`tests/v15-regression-run.txt`, contrast data `tests/v15-contrast-auto.json` and `tests/v15-contrast-low.json`.

## Numbers
- ARTEN holdout (`tests/arten-holdout.json`, 150): baseline 78/150 = 52.0% → final 146/150 = 97.3% (+87.2% relative; target +58%). How-to 28→36/38, navigation 33→36/38, personal 14→37/37, add/edit 3→37/37. The misses were inspected during the work, so it is no longer blind (see `tests/v15-baseline.txt`).
- Regression set `tests/arten-questions.json`: 97/100 → 99/100. `tests/arten-personal.test.cjs`: 14/14.
- Contrast (pixel-sampled, rendered glass included): 45 tile text runs + 9 status colours across Warm Paper, Ink Night and Sage Morning, auto and forced-low tiers: 0 below 4.5:1. Lowest tile 8.96:1 (Ink Night), lowest status colour 5.58:1 (green, Warm Paper).
- Adaptive rendering: this test machine (4 cores, 16 GB, 16.7 ms frames) auto-selects `mid`; `lees-perf="low"` applies `low`.

## Audit (section 9)
| # | Result | Evidence |
|---|---|---|
| A1 | PARTIAL | Local: no console errors in any scenario (local, stand-in backend). Live lock screen: no page errors; the only failed request is the Supabase host, which this sandbox's network does not allow (`tests/screenshots/v15/live-lock-a1.png`). After sign-in on live: NOT RUN (no test passphrase provided). |
| A2 | PASS (source) | `tests/v15-discovery.md`, a–f each confirmed or refuted with source lines. |
| A3 | PARTIAL | One context (local, stand-in backend): Online rgb(17,106,58), "Last seen today at 9:11 pm" rgb(10,79,196), "Not available right now" rgb(176,0,32) (`tests/screenshots/v15/05..07-seen-*.png`). Two signed-in contexts: NOT RUN (no test passphrase provided). |
| A4 | PASS (local, stand-in backend) | Contrast numbers above; `tests/screenshots/v15/polish/0*-contrast-*.png`. Tint changes by theme: rgb(231,214,207) / rgb(76,59,51) / rgb(210,222,213). |
| A5 | PASS (local, stand-in backend); delivery to another session NOT RUN | A5a–g in `tests/v15-local-run.txt`; `local/02-activity.png`, `03-activity-detail.png`, `04-add-note.png`. Add note writes "Note about: Sealed a letter (…)\nLoved this letter" through sendText. |
| A6 | PASS (local, stand-in backend) | `local/22-history.png`, `23-history-open.png`; 11-day fixture hidden. |
| A7 | PASS (local, stand-in backend) | New chat 14→0 messages, archived; sign-out archived and cleared `lees-arten*`; after sign-in History shows it (`local/24-history-after-signin.png`). |
| A8 | PASS (local, stand-in backend) | Visible on home, Activity, Settings, Journal, Sealed letters, Media, Notifications, About (`local/05..10-flower-*.png`); hidden in the chat by design. |
| A9 | PASS (local, stand-in backend) | 12 open frames grow 64px → 390x844; 12 close frames shrink back; no overlay left (frames in `tests/v15-local-run.txt`). |
| A10 | PASS (local, stand-in backend) | 3-turn conversation, bounding boxes at 390x844 and 375x667 (`local/14-three-turns.png`, `15-three-turns-375.png`). |
| A11 | PASS (local, stand-in backend) | ARTEN and sticker sheet: y120→y700 closes, short swipe snaps back. |
| A12 | PASS (local, stand-in backend) | "ARTEN is thinking" 15px, mark animating, "Thought for 0.9 s" pill (`local/13-thinking-warm.png`, `29-thinking-ink.png`). |
| A13 | PASS (local, stand-in backend) | No "X is X"; "Mrs Lees likes sushi." from saved items. |
| A14 | PASS (local, stand-in backend) | Pinned greeting outside the list, personalised (`local/12-arten-open.png`). |
| A15 | PASS (local, stand-in backend) | Profile → Edit name / Edit photo / About me; Edit name opens Profile with the name field ringed (`local/18-edit-name.png`). |
| A16 | PASS (local, stand-in backend) | Journal steps 1→2→3 only after taps; nothing moved while waiting (`local/19..21-steps-*.png`). |
| A17 | PASS (local, stand-in backend) | Order, 6 seals / 5 papers at 52px, preview updates, Seal gated, same fields saved (`local/27-chooser.png`, `28-chooser-filled.png`). |
| A18 | PASS (local, stand-in backend) | Add, edit, delete (Cancel / Delete), reopen persists, author labels (`local/25-about.png`, `26-about-delete.png`). |
| A19 | PASS (local, stand-in backend) | Proposal, nothing written before the tap, row source "arten"; phone number refused (`local/16-proposal.png`). |
| A20 | PASS (local, stand-in backend) | "Mrs Lees wrote that you love football". |
| A21 | PASS (local, stand-in backend); live NOT RUN | 46 in the picker; sticker #41 sends and renders; a partner's sticker #46 renders (`regression/reg15-02..03`). |
| A22 | PARTIAL | One context (local, stand-in backend): Keep writes user_prefs, sign-in with device cache cleared restores Ink Night (`regression/theme-*.png`). Two contexts: NOT RUN (no test passphrase provided). |
| A23 | PASS | 52.0% → 97.3% (+87.2%). |
| A24 | PARTIAL | See 9.1 below. |
| A25 | PASS | No "Coming soon", no hour12:false, no HH:mm. "Countdown" appears only as a v14 function name and a v14 code comment (`index.html:1825`, `lees-v11.js:91`), not a feature; unchanged. |
| A26 | PASS | All `supabase/functions/**` and `vercel.json` byte-identical to d455926 (`tests/v15-baseline.txt`). |
| A27 | PASS | `supabase/RUN_THIS_v15.sql` written, not executed, printed in the final report. |

## 9.1 regression (local, stand-in backend unless stated)
- Sign-in and lock: PASS (wrong passphrase refused, right one opens; `regression/reg15-01-lock-wrong.png`).
- Telegram: NOT RUN (owner confirms).
- Journal create / edit / delete: PASS (through the app's journal functions).
- Send text: PASS; photos as one batch: PASS on receive (`recv` scenario: 6 photos → one notice); voice note: NOT RUN (no microphone in headless Chromium); sticker: PASS.
- Sealed letters create: PASS (A17e); open / delete for me / delete for both: NOT RUN this round.
- Idle sign-out: PASS ("Still there?", 30-second countdown, Cancel / Sign out; Cancel keeps you signed in).
- Settings and reset everything: PASS (wrong passphrase: "Nothing was removed"; right one empties the data and restarts the guide).
- Chat opens; sending jumps to newest: PASS (0px from the end).
- Recently deleted and restore: PASS.
- Tic-tac-toe: PARTIAL (board opens with Challenge; a move needs the other player to accept: NOT RUN).

## Screenshots
- `tests/screenshots/v15/baseline/live-lock.png`, `live-lock-after-push.png`, `live-lock-a1.png`: live, no sign-in.
- `tests/screenshots/v15/01..08-*.png`: first partial round (status colours, composer, stickers).
- `tests/screenshots/v15/local/01..30-*.png`: the 62-check run.
- `tests/screenshots/v15/polish/`: home, settings, Activity, About, chooser and ARTEN in warm / ink / sage / forced-low / desktop, plus contrast captures.
- `tests/screenshots/v15/regression/`: reg15, theme, flows and ARTEN regression scenarios.
