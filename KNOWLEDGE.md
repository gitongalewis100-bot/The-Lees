# KNOWLEDGE.md: what The Lees is

## In one paragraph
The Lees is a private web app (installable on a phone's home screen) for one couple. It is their own place to
talk, keep a shared journal, send letters that open on a chosen day, play a live game, and keep memories. There are
exactly two accounts, called sides: **Lewis** ("Mr Lees") and **Agnes** ("Mrs Lees"). Everything is shared between
those two people and nobody else. A built-in guide called **ARTEN** (a flower in the corner) explains the app,
walks you through it step by step, and remembers facts the two of them choose to save about each other.

## Who uses it and how
- Two people on their own phones (mostly) or a computer. Each signs in with their own passphrase.
- The app signs you out after 5 minutes without a tap, key or scroll; a "Still there?" box counts down 30 seconds first.
- It works as a Progressive Web App: a service worker (`sw.js`) caches the app shell; data lives in Supabase.

## Every part of the app (what a person sees)

### Lock screen and sign-in
Choose your side (Mr Lees or Mrs Lees), type your passphrase. A scanner animation sweeps over it (style chosen in
Settings › Security). Wrong passphrase: the app says so and keeps what you typed. "Forgot passphrase?" uses two
recovery questions (edge functions `setup-recovery`, `recovery-reset`). A lock-screen tagline (one line, or several
that take turns) is shared by both.

### Home
- Greeting ("Good evening, Mr Lees") and the date.
- **Their card**: their photo, name and status, plus one status line:
  - green **Online**: active in the last 10 minutes (shown after 3 seconds of activity);
  - blue **Last seen today at 6:18 pm**: 10 minutes to 10 hours ago;
  - red **Seen early yesterday at 9:05 am** or **Not available right now**: longer than 10 hours.
  Tapping the card opens the chat; the **ACTIVITY** button opens Activity.
- **Tiles** (glassy, tinted by the theme): Moments, Calendar, Archive, Shield, Create (+), Media, Journal, Thinking of
  you, Notifications; and stat tiles: Streak, Mood, Today's question, Closeness, Best time, On this day.
- Settings and Sign out buttons; the ARTEN flower bottom-right.

### The conversation
Messages, photos and videos (sent as one album of up to 30 with one notification), voice notes (press and hold the microphone to talk and let go to send, or tap to record,
listen back and send; optional transcripts), stickers (46 built-in animated stickers) and emoji, drawing, Send later
(scheduling), message effects. Press and hold a message to reply, love, copy, edit (yours), pin to Moments, forward,
blur or delete (for you or for both). Double-tap sends a heart. Swipe right to reply. New messages stay softly
blurred until fully in view; that is how "read" works. The composer is one floating pill: **+** (Attach, Draw,
Stickers & emoji, Send later), the text field ("Reply or hold to talk"), the microphone (grey), and Send (a solid dark circle). Shield blurs the whole chat for
privacy. The chat header line shows the same Online / Last seen colours and opens Activity.

### Create (+)
- **Sealed letters**: write now, open later. One page: a live envelope preview, the title and letter, To, six wax
  seals, five papers, and Open when (Tomorrow morning, This weekend, Pick a date and time, or When they next open
  the app, which opens it full screen the next time they come in). The recipient sees the envelope and a countdown
  at once. Letters can be removed: received ones from your side; sent ones for you or for both.
- **Tic-tac-toe**: a live game docked above the chat, 10 seconds a move; trophies and points in the Trophy cabinet.

### Journal
Shared pages both of you write, with prompts, search and filters (All, Mine, theirs, Notes); saves as you type.

### Media, Moments, Calendar, Archive, Notifications
- Media: every photo, video and voice note, by month.
- Moments: messages you pinned.
- Calendar: each day coloured by how much you talked; tap a day for its messages. Our special days (anniversary,
  birthdays) with celebrations.
- Archive: older messages moved out of the chat (never deleted).
- Notifications: one feed of everything from the other person.

### Activity (v15)
What each of you did, kept for 10 days. One card per day ("Monday 23 November", "13 actions", "Clears on Thursday
3 December"), each session as a timeline (12-hour time, icon, action). Filters All, Mine, Theirs; a Top button. Tap
an entry for its detail and the rest of that session. For messages, letters, photos, nudges and games there is an
**Add note** button that sends a short "Note about: …" message to the chat (so it notifies normally).

### Settings
Profile (status, photo, names, time zone, lock-screen lines, app icon), Appearance (theme just for you, chat look
shared), Notifications (mute, sounds, tones, haptics, vibration, phone alerts), Privacy (read receipts, auto-blur
words, transcripts, Last seen and activity, **About me and [partner]**), Security & sign-in (scanner, passphrase,
recovery questions, chat lock, shake to lock, sign out other devices), Messages & data (archive, scheduled, exports,
encrypted backup and restore, Clear conversation, **Recently deleted**, **Reset everything**), Letters, games & awards,
Guide & ARTEN (Take the tour, Guide switch, Ask ARTEN). A search box finds any setting.

Themes: Warm Paper (default), Ink Night, Sage Morning, Rose Dusk, Soft Cream, Midnight Glass, Rose Garden, Lavender
Mist, Ocean Glass, Forest Ink, Sunset Clay, Peach Linen, Slate Blue, Cocoa Milk, Mint Frost, Night Bloom, and
Follow the time. A theme is previewed, then kept with Keep; it is saved per person (`user_prefs`) and follows you to
another device.

### Backup book (v16)
Settings › Messages & data › **Backup book (PDF)**: one document to keep in case a phone is lost. It holds the two
of you (names, statuses, time zones, last seen), settings, the whole conversation by day with photos, sealed
letters (titles and dates only), the journal, About each other, the last 10 days of activity, your ARTEN
conversations and special days. Paper in your app theme; the conversation in your chat theme's bubbles. It opens
the phone's print sheet: choose Save as PDF (iPhone: Share › Save to Files). **Backup book (Markdown)** saves the
same as a text file. Every 24 hours after sign-in the app offers "Your daily backup is ready".

### Recently deleted and Reset everything
Messages deleted for both go to Recently deleted, where they can be restored (one or all) or deleted for good. Reset
everything (passphrase checked on the server) empties the shared data for both and restarts the guide; accounts,
passphrases, names, photos, themes and settings are kept.

### ARTEN (the guide)
- Opens by zooming out of the flower to full screen; closes back into it. Close with X, back arrow, Escape, the
  phone's back button, or a swipe down.
- Header: the flower in a ring, "ARTEN / Your guide to The Lees", close; then **New chat**, **History**, **Take me to**.
- A pinned greeting on the first open each session ("Good evening, [name]. I'm ARTEN, …"), hidden with its X.
- Ask anything. ARTEN tells how-to questions, "take me to…" requests, personal questions and "remember that…"
  requests apart. Answers start with one short sentence, then short paragraphs; steps are numbered.
- **Show me the steps** lights up each control to tap ("Step 2 of 4: tap the + button") with Back, Next and Stop.
  It never moves you; you tap each target.
- Suggestion chips open a short list of actions (Profile → Edit name / Edit photo / About me).
- **About me and [partner]**: saved lines about each of you, each showing "Written by …" or "Added by ARTEN" and the
  date. ARTEN answers personal questions only from these lines, citing your partner when they wrote it ("Agnes wrote
  that you love football"). When you say "remember that she likes sushi", ARTEN proposes it with **Add to the list**
  and saves only after you tap. It refuses phone numbers, emails, bank or card details, ID numbers, addresses,
  passwords and secrets.
- **Chat history**: your own conversations from the last 10 days, grouped by day; New chat and signing out save the
  current one there.
- When nothing is touched for 3 seconds, the flower slides left and "Ask" shows in its place, then it slides back.
- Thinking state: the flower turns and pulses; "ARTEN is thinking / cooking / ARTENING"; then "Thought for 1.2 s".

### Notifications to phones
New messages reach the other person through the `notify-message` edge function (Telegram), driven by database
webhooks and batched (`notify_batches`, `notify_log`). Do not touch any of it.

## Glossary
- **Side**: `Lewis` or `Agnes`, the internal identity of each person. **Pair**: the two of them (`pairs`, one row).
- **Card message**: a message whose text encodes a letter, game, nudge or sticker (`[[sticker:id]]`, card JSON); see `LeesApp.cardOf`.
- **Panel**: any full page opened with `LeesApp.openPanel` (Settings, Journal, …). **Sheet**: the bottom sheet (`#sheet`).
- **Stand-in backend**: the in-memory fake Supabase used by the local test harness.
