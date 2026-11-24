> Historical (v4/v5 publishing). Current process: `DEPLOY.md`.

# PUBLISH TO LIVE - The Lees (final v4)

For: Grok (publisher).
Read this whole file first. It is the only instruction you need.

## The rule
Publish this folder exactly as it is. Do not edit, rename, add, delete, reformat, or fix any file. Do not change settings, environment variables, Supabase, DNS, vercel.json, or the host. Do not run any SQL: this build has no database change. If anything fails, stop and report. Do not guess.

## Step 1 - check the files
Open a terminal in this folder and run:

    sha256sum -c SHA256SUMS.txt

Every line must end in OK. If any line says FAILED or a file is missing, stop. Do not publish.

## Step 2 - publish (pick ONE method)
This build changes existing files only. It deletes nothing and adds no new folders, so overwriting the files is enough. Do not delete anything in the repository.

Files to replace (all of them, same names): index.html, lees-patch.js, lees-patch.css, CHANGELOG.md, PROGRESS.md, DEPLOY.md, test-report.md, PUBLISH_FOR_GROK.md, SHA256SUMS.txt. Every other file in the repository stays as it is.

### Method A - GitHub website (no terminal needed)
1. Open the repository on github.com. Make sure the branch selector says "main".
2. Click "Add file", then "Upload files".
3. Drag in the nine files listed above from this folder. GitHub asks to overwrite the same-named files. Accept.
4. In the "Commit changes" box, type: The Lees v4 final
5. Choose "Commit directly to the main branch", then click "Commit changes".

### Method B - command line (git)
    git clone <repository-url> the-lees
    cd the-lees
    git checkout main
    git pull
    cp /path/to/this/folder/index.html /path/to/this/folder/lees-patch.js /path/to/this/folder/lees-patch.css .
    cp /path/to/this/folder/CHANGELOG.md /path/to/this/folder/PROGRESS.md /path/to/this/folder/DEPLOY.md /path/to/this/folder/test-report.md /path/to/this/folder/PUBLISH_FOR_GROK.md /path/to/this/folder/SHA256SUMS.txt .
    git add -A
    git commit -m "The Lees v4 final"
    git push origin main

Replace /path/to/this/folder with the real folder path. Use the repository address the owner gave you for <repository-url>.

After either method, the repository's main branch must show the same nine files as this folder.

## Step 3 - wait
Wait until the host shows the deployment as complete. Note the commit hash and the live address.

## Step 4 - check the live site
Open the live address in a private window, on a phone and on a desktop. Every item must pass:
- Console: no errors on load.
- Lock screen: no "Welcome back", no notebook icon, no "Notes" heading. Tagline: "Do what you love, love what you do." One account switch above the passphrase field.
- Art: two people on a wooden chair seen from behind. Their hands rise in turns. Stars twinkle.
- Passphrase: after Open, the dots stay dots. A thin light crosses them and each dot lights as it passes. The label reads "Verifying", then "Verified".
- Wrong passphrase: the light stops, the blur clears, no welcome, no app shown.
- Right passphrase: "Verified" holds briefly, then "Welcome, Mr Lees" (or "Welcome, Mrs Lees") with confetti, then the app.
- Settings: "Sign-in object" offers "Scan line (recommended)" and the lens shapes.
- Chat: the partner's typing dots show on their side. Long-press Send opens the schedule actions. The boomerang plays from the send button after five quiet minutes.

## Stop and report (do not fix) if
- Any console error appears on load.
- Any passphrase character is visible at any point.
- The right passphrase does not reach the welcome.
- The app is missing or blank.

Report the address, the device, the step, and the console text or a screenshot to the owner. Make no further changes.

## Roll back
Revert the v4 commit on main (git revert <commit>, then push). Or redeploy the previous deployment from the host dashboard. The previous version returns within about a minute.

## Files in this folder
- index.html, lees-patch.js, lees-patch.css: the app.
- CHANGELOG.md, PROGRESS.md, DEPLOY.md, test-report.md: records.
- PUBLISH_FOR_GROK.md: this file.
- SHA256SUMS.txt: checksums.
