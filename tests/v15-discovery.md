# v15 discovery (section 2.4, 2.5) and flower hiding paths (4.6)

No test passphrase was provided, so nothing behind sign-in was observed on the live site. Every item below is
**SOURCE-ONLY** (read from d455926, which the live site served byte-for-byte before the v15 push: `lees-v12.js`,
`lees-v9.js` and `index.html` sha256 matched) unless it says "local".

Live, without sign-in (2.3): `tests/screenshots/v15/baseline/live-lock.png` (v14 lock screen, 390x844, before the
push) and `tests/screenshots/v15/live-lock-after-push.png` (v15). The one console error in both is
`cdn.jsdelivr.net` being refused by this sandbox's network proxy, not by the app.

| # | v14 claim | Result | Evidence |
|---|---|---|---|
| a | Things we know shows an Add row and per-line Delete | **Refuted.** v14 shows two text areas, "About me" and "About [partner]", each with Save / Edit / Delete for the whole note (4000 characters). | d455926 `lees-v12.js:1097` `area("me", "About me")`; `openFacts` builds one `<textarea>` per subject. v15 replaces it with per-line rows (4.16). |
| b | Home card shows "Signed out after being idle" under the last-seen line | **Refuted at source.** `paintSeen` (d455926 `lees-v12.js:187`) writes exactly one line into `.seen12`. "Signed out after being idle" is only the Activity label for the `idle` action (`lees-v12.js:43`), so it can appear as an Activity entry, not as a second card line. v15 keeps one status line. | source; local screenshot `tests/screenshots/v15/local/01-home.png` |
| c | Sticker picker shows 21 stickers, not 46 | **Refuted at source; likely cause found.** `STICKERS` has 46 keys (d455926 `index.html:722`) and the picker renders every key. The grid is 4 columns (`lees-v9.css:481`, 3 under 360px) inside a scrolling sheet, so about 21–24 fit on one phone screen with no hint that it scrolls. v15 adds "46 stickers · scroll for more" at the top. Local: 46 buttons. | `tests/screenshots/v15/local/11-stickers.png` (local, stand-in backend) |
| d | Create and Journal tiles have a pressed look | **Not confirmed.** v14 gives these two tiles their own rules (`.navbtn.journal-tool`, `.navbtn.create-tool`, d455926 `lees-v12.css:423-424`), so they render differently from the other tiles; I could not see the live device. v15 gives every tile the same glass finish with `transform:none` and the same shadow. | source |
| e | ARTEN answered "X is X" and said it had no facts while four exist | **Confirmed, two causes.** (1) `loadNote` reads only rows where `owner_side = me` (d455926 `lees-v12.js:1019`), so lines your partner wrote were invisible; four facts written by the other person read as "none". (2) Questions without a fact word (for example "what does she do for work") fell through to the Things we know help text. Grammar: `composePersonal` prefixed every line with the name ("Agnes is your partner. Agnes her favourite colour is green.", `lees-v12.js:1006`). v15 reads `arten_items` from both authors (falling back to v14 notes until the SQL runs), cites the author, and has a guard against "X is X". | holdout baseline run: personal 14/37 → 37/37 |
| f | "Last seen" shows where "Online" should | **Confirmed at source.** v14 `isOnline` (d455926 `lees-v12.js:158`) trusted only the realtime presence entry: no entry, or an `away` flag, meant offline even when the person had just acted (activity log, `last_seen_at`). v15 `statusOf` also treats any activity in the last 10 minutes as Online (still gated by the 3-second presence delay in `publishPresence`). | 2.5 trace below |

## 2.5 Presence trace

1. `index.html` `noteUserActivity()` (keydown, touchstart, scroll) sets `lastActivity`, starts `presenceStreak`, and calls `publishPresence(false)`.
2. `publishPresence` (d455926 `index.html:6615`) tracks `{ typing:false, ts: Date.now() }` on the presence channel, with `away:true` unless the person has been active for at least 3 seconds (`elapsed >= 3000`, line 6619), is visible, and is not idle. It also runs every 4 seconds from the main timer, so `ts` is refreshed on each **track**, and only then.
3. The other device's `presenceState[side]` holds that payload. `renderPresence()` (line 2829) calls `LeesV12.presenceLine()` and colours `#presence`.
4. v14 `isOnline(side)`: false if there is no entry or `away`, or `ts` older than 10 minutes. So a dropped realtime socket (common on phones in the background) showed "Last seen" for someone actively using the app.
5. v15 `statusOf(side)`: Online if presence says so, **or** the newest activity / `last_seen_at` is within 10 minutes and the last action was not a sign-out. Blue up to 10 hours, red after. `presenceLine` returns `{k}`; `renderPresence` adds `k-on|k-seen|k-off`.

## 4.6 Flower hiding paths

v14 hid the flower when: `view === "chat"`, `#mediaPreview`, `.v9-viewer`, `.al11`, `.av12`, `.v8-overlay`, `.love9`, `.once-viewer`, and (implicitly) under the Activity page (`.act14`, removed earlier this round).

v15 (`Arten.position`, `lees-v12.js`):
- **Kept: the conversation (`view === "chat"`).** In the chat the bottom-right corner holds the composer's send button and the newest messages; a 64px flower there would cover them or push above the "new messages" pill. Chat is not on the spec's list of screens.
- **Kept: full-screen viewers** `#mediaPreview` (now only when not `.hidden`), `.v9-viewer`, `.al11`, `.av12`, `.v8-overlay`, `.once-viewer`, `.ov9`: these are full-screen modals.
- **Removed: `.love9`.** It is a non-modal, pointer-events-none heart effect that lasts about 1.6 s; hiding the flower for it made the flower blink away for no reason.
- **Removed: `.act14`.** The flower now sits above the Activity page.
- **Added: the sticker sheet** (spec), the **Activity detail sheet** and **Add note sheet** (`.act15-sheet`, `.an15`, which put their right-aligned button where the flower sits), and the **centred banner** (`.cb-scrim`, a modal).
- Pages now leave 104px under their last row so the flower never sits on the final item.
- ARTEN's own page (and its Chat history view) hides the floating flower; the same flower is shown in the ring beside the ARTEN title.

Local check (stand-in backend): visible on home, Activity, Settings, Journal, Sealed letters, Media, Notifications and About (A8 lines in `tests/v15-local-run.txt`).
