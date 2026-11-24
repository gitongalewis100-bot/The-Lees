# The Lees

A private app for two people (Mr and Mrs Lees): conversation, shared journal, sealed letters, a live game,
memories, and ARTEN, a built-in guide. Live at https://the-lees-sandy.vercel.app.

- Hosting: static site, deployed by Vercel from the `main` branch. No build step.
- Data: Supabase (project `emimwlpsfchndxaxzswh`): auth, Postgres with row-level security, realtime, storage, edge functions.
- Current version: v15. See `CHANGELOG.md`.

## Documents
| File | Read it for |
|---|---|
| `AGENTS.md` | **Start here.** Rules and workflow for anyone (human or agent) working on the project. |
| `KNOWLEDGE.md` | What the app is and every feature, in plain language. |
| `ARCHITECTURE.md` | Files, load order, modules, APIs, events, storage, caching. |
| `DATABASE.md` | Tables, functions, SQL files and which have been run. |
| `DESIGN.md` | Themes, tokens, the polish layer, adaptive rendering. |
| `TESTING.md` | Local harness, scenarios, ARTEN tests, result labels. |
| `ROADMAP.md` | Done, next, known issues. |
| `OWNER_ACTIONS.md` | What is waiting on the owner (SQL to run, pushes). |
| `DEPLOY.md` | How a release reaches the live site. |

## Voice transcription (transcribe-voice): owner steps

The build does not deploy or set secrets. Before the Settings switch "Transcribe my voice notes" does anything, you need to:

1. Deploy: `supabase functions deploy transcribe-voice`. Keep JWT verification on (the default).
2. Set the key: `supabase secrets set TRANSCRIBE_API_KEY=...`
3. Optional: `TRANSCRIBE_API_URL` and `TRANSCRIBE_MODEL`. The default is the OpenAI speech-to-text endpoint with `whisper-1`. Confirm this is the provider you want. Voice clips are sent to it.

Limits: one clip per call, 5 MB maximum, 30 calls per user per hour. The hourly count is kept in memory per function instance, so with several instances running it is a best-effort limit, not a strict one. A strict limit would need a table, which this build does not add.
