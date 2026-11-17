# The Lees

A private shared journal and conversation for two people.

Status: front-end build. Data is stored in the browser for now

Hosting: static site, deployed from the `main` branch. No build step.

## Voice transcription (transcribe-voice): owner steps

The build does not deploy or set secrets. Before the Settings switch "Transcribe my voice notes" does anything, you need to:

1. Deploy: `supabase functions deploy transcribe-voice`. Keep JWT verification on (the default).
2. Set the key: `supabase secrets set TRANSCRIBE_API_KEY=...`
3. Optional: `TRANSCRIBE_API_URL` and `TRANSCRIBE_MODEL`. The default is the OpenAI speech-to-text endpoint with `whisper-1`. Confirm this is the provider you want. Voice clips are sent to it.

Limits: one clip per call, 5 MB maximum, 30 calls per user per hour. The hourly count is kept in memory per function instance, so with several instances running it is a best-effort limit, not a strict one. A strict limit would need a table, which this build does not add.
