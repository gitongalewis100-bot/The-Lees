# AGENTS.md: start here

You are working on **The Lees**, a private app for exactly two people. Read this file first, then the others in
this order:

1. `KNOWLEDGE.md`: what the app is and every feature, in plain language.
2. `ARCHITECTURE.md`: files, load order, modules, the `LeesApp` API, events, storage, caching.
3. `DATABASE.md`: Supabase tables, functions, edge functions, which SQL has been run, how SQL is delivered.
4. `DESIGN.md`: themes, tokens, the v15 polish layer and adaptive rendering.
5. `TESTING.md`: the local harness, the ARTEN tests, how to label results.
6. `ROADMAP.md`: what is done, what is next, known issues.
7. `OWNER_ACTIONS.md`: what is waiting on the owner (SQL to run, pushes to approve).
8. `CHANGELOG.md`: history by version (newest at the bottom).

Older files (`PROGRESS.md`, `DEPLOY.md` sections before v12, `PUBLISH_FOR_GROK.md`, `test-report.md`) are history.

## Facts you must not get wrong
- Live site: https://the-lees-sandy.vercel.app (Vercel deploys `main` automatically; no build step).
- Repo: `gitongalewis100-bot/The-Lees`. Supabase project ref: `emimwlpsfchndxaxzswh`.
- The two people are the **sides** `Lewis` (shown as "Mr Lees" by default) and `Agnes` ("Mrs Lees"). Display names can be changed in Settings › Profile, so never hard-code them in text; use `LeesApp.name(side)`.
- The owner is a founder in Nairobi (time zone Africa/Nairobi). Write plainly; prefer working results over plans.

## Hard rules (carried from every round; break none)
1. **Never run SQL** (no Supabase tools, psql, dashboard or MCP), and do not inspect the live database. Write SQL into one file, `supabase/RUN_THIS_vNN.sql`, make it safe to run twice, end it with check selects that each return a boolean column named `check`, and give the owner the whole file in one copy box with instructions. See `DATABASE.md`.
2. **Never touch**: `supabase/functions/*` (including `notify-message`), the Telegram token or chat id, the `notify_batches` / `notify_log` tables, database webhooks, `vercel.json` (and its CSP), `lees-emoji.js`, `emoji/`, `fonts/`, `icon-*.png`, `manifest.webmanifest`.
3. **Do not change these flows** unless the owner explicitly asks: sign-in and lock, the passphrase flow, journal entry, media upload, games, sealed-letter creation and sending (the v15 chooser *UI* is the one exception), Reset everything, Recently deleted and restore.
4. **Never add** features named: Whisper, Memory Lane, Shared Checklist, Mood Weather, Two-Key Vault, Thought Bubbles, Sketch Reply, Daily Photo Prompt, Would You Rather, Countdown, Shared Playlist, Mood Sync, Weekly Summary, Thread Badges, Quick Reactions, Focus Window, Pinned Moments, Seen Ticks. No read ticks. Never write "Coming soon".
5. **Confirmations** use `LeesApp.centredBanner` with exactly one Cancel and one action button. Sign-out has exactly Cancel and Sign out. No "Done" button for editing.
6. **Every time shown to a person is 12-hour with am/pm** (for example "6:18 pm"). Never `hour12:false` or `HH:mm` in user-facing code.
7. **Secrets**: never print, log or commit tokens, keys, passphrases, the Telegram chat id or browser auth state (`tests/.auth/` is git-ignored).
8. **Evidence**: a check is PASS only if you ran it in a real browser (Playwright Chromium, 390x844 unless stated) and saved a screenshot under `tests/screenshots/`. Reading source is SOURCE-ONLY. Anything not run is NOT RUN, with the reason. Results from the local harness must say "(local, stand-in backend)". Never claim a result you did not produce.
9. If a fix breaks something earlier, fix it and re-run the regression list in `TESTING.md`.
10. Do not include model names in commits or code.

## When you finish: update the documents (mandatory)
Work is not done until the documents match the code. Before your final commit, update every file your work touched:
- `CHANGELOG.md`: a section for your version, one line per change.
- `ROADMAP.md`: move finished items to Done, add new next steps and anything you found to Known issues.
- `OWNER_ACTIONS.md`: anything the owner must do (SQL to run, pushes to approve, checks only they can make), with steps. Tick items that are done.
- `DATABASE.md`: any new SQL file, table, column or function, and its run status. New SQL goes in `supabase/RUN_THIS_vNN.sql` and is given to the owner in one copy box with instructions.
- `KNOWLEDGE.md`: any feature added, changed or removed, described as a person sees it.
- `ARCHITECTURE.md`: new files, globals, events, storage keys, and the current `?v=` and `CACHE` numbers.
- `DESIGN.md`: new tokens, components or visual rules. `TESTING.md`: new scenarios and the latest pass counts.
- `tests/vNN-results.md` and a final report: what was run, with evidence paths and honest labels.
Say in your final message which documents you updated. If a document needed no change, say that too.

## How to work
- Branch: work on the branch you are given; `main` is what is live. Push to `main` only when the owner says so, and only as a fast-forward (run `git fetch` first; if `main` moved, stop and tell the owner).
- Every changed script or stylesheet gets its `?v=` number bumped in `index.html`, and `sw.js` gets a new `CACHE` name, or phones keep the old files.
- Code that decorates the home screen must be idempotent: the app re-renders home every few seconds (`lees:render`).
- New modules talk to the app only through `window.LeesApp`, `window.LeesFeatures`, `window.LeesV12` and the `lees:*` events (see `ARCHITECTURE.md`). Live values belong in the `Object.defineProperties` block at the end of `index.html`, because `Object.assign` freezes getters.
- Never use the class name `in` for state: it is the global input style.
- `#panelBody` is shared by every page; repaint code must check it is still on its own page.
- A MutationObserver that writes inside the node it watches loops forever; observe attributes only, or compare before writing.

## Pitfalls from this environment
- The cloud sandbox may block hosts. The live site and `cdn.jsdelivr.net` were allowed for the session environment "The-Lees"; the Supabase host is deliberately not allowed (see rule 1).
- Tags may be refused by the git proxy (403); branch pushes work only while the owner's GitHub is connected.
