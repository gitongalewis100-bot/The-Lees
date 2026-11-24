# ARCHITECTURE.md

A static site with no build step. Vercel serves the repository root from `main`. All logic runs in the browser and
talks to Supabase (auth, Postgres with row-level security, realtime, storage, edge functions).

## Files and load order (`index.html`)
Stylesheets, in this order (later ones override earlier ones):
`lees-patch.css` → `lees-v8.css` → `lees-v9.css` → `lees-v11.css` → `lees-v12.css` (v12 to v15 rules, the v15 polish layer and the `data-perf` tiers are at the bottom).

Scripts (all `defer`, run in this order after the inline core):
| File | Role | Global it exposes |
|---|---|---|
| Supabase UMD (`@supabase/supabase-js@2.49.4` from cdn.jsdelivr.net) | client library | `window.supabase` |
| inline `<script>` in `index.html` (about 6,000 lines) | the core app: lock, sign-in, sync, chat, composer, panels, settings, themes, presence, idle sign-out, journal, media, notifications | `window.LeesApp` |
| `lees-emoji.js` | emoji assets helper (do not touch) | |
| `lees-patch.js` | early patch layer: unread banner and tray, typing row, view-once gate, sign-in lens, clear sheet | `window.LeesHooks` |
| `lees-v8.js` | Create hub, sealed letters (incl. the v15 chooser), tic-tac-toe, awards | `window.LeesFeatures` |
| `lees-v9.js` | rebuilt screens: Notifications, Journal, Calendar, Media, Send later, Clear, chat studio, home extras, lock-screen lines, stickers and emoji picker | `window.LeesV9` |
| `lees-v10.js` | swipe to reply, jump to quote, Our special days | `window.LeesV10` |
| `lees-v11.js` | album view, sealed-letter countdown | `window.LeesV11` |
| `lees-v12.js` | v12–v15 layer: Activity and status, Reset and Recently deleted entries, letters that open on next launch, the guide, ARTEN (knowledge base, intents, items, conversations, About page, steps guide), album viewer, adaptive rendering | `window.LeesV12` |
| `sw.js` | service worker: network-first for the page, cache-then-refresh for static files; never caches Supabase | |

Each layer reaches the app only through the globals above and `lees:*` events. Never edit the inline core for a
feature that a layer can add.

## `window.LeesApp` (index.html, end of the inline script)
Getters: `sb` (Supabase client), `me`, `other`, `pairId`, `userId`, `unlocked`, `view` (`home` | `chat` | `panel`).
Live values in `Object.defineProperties`: `journal`, `specialDays`, `seen`, `presence`, `pairSettings`, `members`,
`unreadN`, `draft`. Add new live values there, not with `Object.assign`.
Useful methods: `name(side)`, `notice(title, desc, opts)`, `centredBanner({title, desc, okLabel | buttons, countdown})`,
`openPanel(title, sub, build)`, `goBack()`, `openChat()`, `sheetOpen(build)`, `sheetClose()`, `sendText(text)`,
`thread()`, `cardOf(text)`, `sendCard(obj)`, `openSettings()`, `openSettingsCategory(id)`, `openJournal()`,
`openMedia()`, `openNotifications()`, `openVault()`, `setAppTheme(id)`, `renderHome()`, `reloadAll()`,
`saveJournal / editJournal / deleteJournal`, `STICKERS`, `stickerNode(id)`, `presenceTrack`, `idleFor()`,
`setActivityAt(t)`, `store` (localStorage helper).

## `window.LeesV12` (lees-v12.js)
`presenceLine`, `openActivity(side)`, `openReset`, `guide`, `arten`, `ask` (= knowledge-base search, used by
`tests/arten-v13.test.cjs`), `respond(q)` (full ARTEN pipeline: `{id, kind, lead, paras, text, proposal, offer}`),
`intentOf`, `items` (saved lines store), `convo` (conversation store), `openAbout()`, `itemSentence`,
`composePersonal` / `factsReply` (v14, kept for `tests/arten-personal.test.cjs`), `steps` (Show me the steps),
`stepsFor(id)`, `perf` (adaptive rendering), `beforeSignOut(why)` (called by `confirmSignOut` / `idleSignOut`),
`log(action, detail)`, `_act`, `_kb`.

## Events (`document`)
`lees:unlocked`, `lees:locked`, `lees:synced` (after a data pull), `lees:render` (home and chat re-render, every few
seconds), `lees:view` (`{view}`), `lees:panel` (`{title}`), `lees:activity`, `lees:remote-act`, `lees:remote-reset`,
`lees:feed`, `lees:resume`, `lees:perf` (v15, `{tier}`).

## ARTEN pipeline (lees-v12.js)
1. `intentOf(q)` → `modify` (change or delete a saved line) | `add` ("remember that…") | `personal` | `app`.
2. `add`: `sensitiveKind` refuses numbers and secrets; otherwise `addProposal` builds a preview, and nothing is
   written until the person taps **Add to the list** (`Items.add(..., "arten")`).
3. `personal`: `Items.load()` (arten_items, or the v14 `arten_notes` when the v15 SQL has not been run) → relevance
   by synonym groups → `itemSentence` / `cited` (second person for you, the name leading for your partner, "X wrote
   that…" for their lines, a guard against "X is X").
4. `app`: `search(q)` over the knowledge base `KB` (phrases folded by `PHRASES`, synonyms `SYN`, stop words, stems,
   one-letter typo tolerance, rarer words weighted by `idf`).
5. `Arten.render` writes a short lead, a bold lead and numbered steps only when the entry has steps, short
   paragraphs, and actions (Show me the steps from `stepsFor(id)`, Add to the list, Add a line).
Conversations: `Convo` saves to `arten_conversations` (falls back to localStorage `v15-arten-conv-<side>`), archived
by New chat and sign-out, listed for 10 days.

## Storage keys (browser)
localStorage: `pp-*` (core settings, kept on reset where listed in `KEEP_KEYS`), `v8-*` (letter drafts),
`v9-*`, `v12-*` (activity cache, usage, guide state, tips), `lees-theme-v14`, `pp-apptheme-<side>`,
`lees-activity-opened-v13`, `v15-arten-conv-<side>` (ARTEN history fallback), `lees-perf` (rendering override).
sessionStorage: `lees-arten-*` (cleared at sign-out), e.g. `lees-arten-greet-off`.

## Caching and releases
Every changed script or stylesheet needs a higher `?v=` in `index.html`, and `sw.js` needs a new `CACHE` value.
Current (end of v15): lees-patch.css 31, lees-v8.css 5, lees-v9.css 10, lees-v11.css 5, lees-v12.css 7,
lees-emoji.js 2, lees-patch.js 18, lees-v8.js 10, lees-v9.js 10, lees-v10.js 2, lees-v11.js 2, lees-v12.js 7;
CACHE `lees-shell-v15-3`.

## Presence and status (v15)
`index.html` `publishPresence` tracks `{ts, away}` on a realtime presence channel every 4 seconds; Online needs 3
seconds of activity. `lees-v12.js` `statusOf(side)` combines presence with the newest activity and `last_seen_at`:
on (≤10 min) / seen (≤10 h) / off. `paintSeen` writes the home line; `presenceLine` feeds the chat header, which
gets the class `k-on | k-seen | k-off`.
