# v15 results (partial)
Environment: local Playwright, 390x844, in-memory Supabase stand-in (tests/ harness not committed). LEES_TEST_PASSPHRASE was not set, so nothing was run against the live site. No SQL was run.
- 4.1 Online/Last seen/red: PASS (local fake backend): "Online now" rgb(17,106,58), "Last seen today at 4:02 pm" rgb(10,79,196), "Not available right now" rgb(176,0,32). Two-context test NOT RUN.
- 4.2 Glassy tiles: PASS (local, Warm Paper only); text rgb(42,36,32) on ~rgb(231,214,207). Ink Night and Sage Morning NOT RUN.
- Composer redesign: PASS (local screenshot tests/screenshots/v15/02-chat-composer.png). ARTEN composer restyled, SOURCE-ONLY plus one screenshot.
- 4.6 Flower: Activity no longer hides it (SOURCE-ONLY); other screens NOT RUN. It is still hidden in the conversation view.
- 4.19 Stickers: source defines 46; local picker shows 46 buttons in a scrollable sheet (PASS, local).
- NOT DONE: 2.x baseline tag and live screenshots, 3.x holdout, 4.3-4.5, 4.7-4.18, 4.20, 5.x, section 9 regression, section 10 live check.
