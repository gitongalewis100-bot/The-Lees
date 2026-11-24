# OWNER_ACTIONS.md: what is waiting on you

Keep this file current. Tick a line when it is done, with the date.

## 1. Push the finished v15 work (needs GitHub connected)
- [ ] Connect GitHub, then tell the agent "push". It pushes branch `claude/lees-v15-continuation-m4pvd1`, then
  fast-forwards `main`. Vercel deploys `main` within about a minute.
- What is already live: v15 core (main = 7ebfb5e). What the push adds: the polish pass, adaptive rendering, the
  flower stepping aside while you type, the regression tests and all project documents.

## 2. Run the v15 SQL (once)
File: **`supabase/RUN_THIS_v15.sql`** (in the repository; the full text is also in `tests/v15-final-report.md`, section R-g).

Steps:
1. Open https://supabase.com/dashboard → your project "The lees app" (ref `emimwlpsfchndxaxzswh`).
2. Left menu → **SQL Editor** → **New query**.
3. Open `supabase/RUN_THIS_v15.sql` on GitHub (or in the report), copy **all** of it, paste it into the editor.
4. Press **Run**. It is safe to run twice and deletes nothing except activity and ARTEN chats older than 10 days.
5. The last five statements are checks. Each must show `check = true`. If the editor only shows the last result,
   run each of the five `select … as check;` lines on its own.
6. If you see "pg_cron not available", that is fine: the app still clears old items itself.

What changes after it runs:
- About me and [partner] switches from your v14 notes to one row per line; every existing line is copied across
  (your v14 notes are kept, not deleted).
- ARTEN's chat history is saved to your account, so it follows you across devices.
- Activity older than 10 days is deleted on the server, not only hidden.

If any check is `false`: copy the error or the false line and give it to the agent. Do not edit the file by hand.

## 3. Optional checks only you can do
- [ ] Telegram: send a message from one phone and confirm the other gets the Telegram alert.
- [ ] A test passphrase for automated live checks: if you want the agent to test the live site signed in, set
  `LEES_TEST_PASSPHRASE` in the cloud environment's variables (never paste it in chat). Without it, signed-in live
  checks are reported as NOT RUN.
- [ ] Two phones: confirm Online (green) / Last seen (blue) / red, a note from Activity arriving, and a theme change
  following you to the other device.

## Done
- 2026-11-23: v15 core pushed to main (7ebfb5e) and live.
