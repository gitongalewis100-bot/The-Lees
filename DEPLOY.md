# DEPLOY: The Lees

## Current process (v12 onwards)
1. Work on a branch. Bump `?v=` for every changed script or stylesheet in `index.html`, and `CACHE` in `sw.js`.
2. Run the checks in `TESTING.md`.
3. When the owner approves: `git fetch origin main`; if `main` has not moved, push the branch, then push it to
   `main` as a fast-forward (`git push origin HEAD:main`). Never force-push.
4. Vercel deploys `main` automatically. Confirm: the live `index.html` lists the new `?v=` values, the live
   scripts match the commit (`curl -s https://the-lees-sandy.vercel.app/lees-v12.js | sha256sum`), and `/sw.js` shows the new `CACHE`.
5. If the version has SQL, give the owner `supabase/RUN_THIS_vNN.sql` with the steps in `OWNER_ACTIONS.md`.
   Agents never run it.
6. Rollback: push the previous good commit to `main` as a new commit (git revert), never a force-push.

## History (v3 to v5; kept for reference)

## Round 5 note (final v4)
Publish only. No database step. See PUBLISH_FOR_GROK.md, which is the controlling instruction for publishing and deploying this build.

## Round 4 note (v4 candidate)
This round changes only index.html, lees-patch.js and lees-patch.css. There is no database change. The Step 1 and Step 2 checks above are not needed for v4. Only Step 3 (publish) and Step 4 (live check) apply, and the live check must include the boomerang, the divider count (one), and typing on the home screen.

The site is static and is deployed from the main branch (see README). The database change is one additive migration.

## Before you start
1. Keep the current live version reachable so you can roll back. If the repo is a git clone, note the current commit: `git rev-parse HEAD`.
2. Back up the database (Supabase dashboard: Database, Backups), or take a logical dump of pair_settings and journal_entries if they exist.

## Step 1 - check the live schema (read only)
Run in the Supabase SQL editor:

    select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'pair_settings';
    select to_regclass('public.journal_entries');
    select id from storage.buckets where id = 'media';

Note the results. If journal_entries already exists with different columns, stop and send the results before running step 2.

## Step 2 - run the migration (on staging first if you have it)
Open supabase/migrations/2026-11-16_checkpoint3.sql, paste it into the SQL editor, and run it. It is safe to run twice. It drops nothing.

Then check:

    select column_name, data_type from information_schema.columns
      where table_name = 'pair_settings' and column_name = 'tagline';
    select to_regclass('public.journal_entries');

Expected: one row for tagline (text), and journal_entries present.

## Step 3 - publish the site (push to main)
If the repo is a git clone:

    git checkout main
    git pull
    # copy the files from The-Lees-v3.zip into the repo, overwriting the old ones
    git add -A
    git commit -m "The Lees v3: messaging morph, sign-in loader, shield, send, media, settings, vibration, tagline"
    git push origin main

The static host deploys from main. Wait for the deployment to finish (about a minute), then continue.

If the repo is not a clone, upload the changed files to the repo through the GitHub web interface on the main branch, in this order: index.html, lees-patch.js, lees-patch.css, supabase/migrations/2026-11-16_checkpoint3.sql, CHANGELOG.md, PROGRESS.md, DEPLOY.md.

## Step 4 - check the live site
Open the live address in a private window, on a phone and on a desktop, and check:
- Sign-in: no "Welcome back", no notebook icon, no "Notes". The tagline reads "Do what you love, love what you do." The string art closes and reopens. A password check blurs the art and the lock.
- Loading: "Checking" letters wave for two turns while the lock blurs, then the welcome appears.
- Shield: on desktop, a long press turns the shield on and shows no copy menu.
- Send: the boomerang plays for the send button and for Enter.
- Home: the Media tile sits after Shield and opens the Media panel.
- Settings: the label is inline with its icon; the box matches the tool grid; sign-out is a red block; Vibration is listed under Haptics; the Lock-screen tagline can be edited and saved.
- Chat: a partner's typing bubble appears on their side in the thread. When the message arrives, the bubble zooms, reshapes, settles, and the words wave in. Effects play after that.
- Unread: one "New messages" divider; only the banner and tray show unread.
- Browser console: no errors on load.

If the tagline save says "Saved on this device only", the migration has not reached the database yet. Re-run step 2 and check.

## Rollback
- Site: revert the commit on main (`git revert <commit>` then `git push origin main`), or redeploy the previous commit from the host dashboard. The site returns to the previous version within about a minute.
- Database: the migration is additive and nothing is removed. Leave it in place. Only remove the tagline column or journal_entries table manually if you have checked that nothing depends on them.

## v11.1 database step (one file)
Run supabase/RUN_THIS_v11.sql once (same SQL as migrations/2026-11-19_v11_trash_vault.sql, with instructions and checks) in the Supabase SQL editor (safe to run twice; additive).
Until it runs, the app keeps working with the old delete behaviour and Recently deleted shows "One database update
needed". Messages deleted for both before this, by the old function, had their content wiped and can't be recovered;
messages from an old "Clear for both" were only hidden and do appear in Recently deleted.
