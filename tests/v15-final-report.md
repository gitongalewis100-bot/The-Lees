# The Lees v15: final report

## R-a. Commit, address, deployment
- Live: https://the-lees-sandy.vercel.app serves **main = 7ebfb5e** ("The Lees v15: online colours, glassy tiles, activity groups and 10-day retention, ARTEN greeting and structure, floating composer, step guide, sealed chooser, about pages, stickers"). It was a fast-forward from d455926; nothing force-pushed or deleted. Confirmed live: `lees-v12.js`, `lees-v9.js` and `lees-v8.js` match the commit byte-for-byte, and `sw.js` serves `lees-shell-v15-2`. The Vercel dashboard itself was not read: there is no Vercel access from this session.
- Overnight work (polish, adaptive rendering, documents, tests) is committed on branch `claude/lees-v15-continuation-m4pvd1` and **not on main yet**. It is waiting for your go-ahead to push in the morning; it fast-forwards from 7ebfb5e.
- Tag `v14-baseline` exists locally on d455926; pushing it was refused by the session's git proxy (HTTP 403).

## R-b. Discovery (2.4); full write-up in `tests/v15-discovery.md`
- a. Things we know had Add row and per-line Delete: **refuted** (v14 had two whole-note text areas).
- b. "Signed out after being idle" under the card: **refuted at source** (one line; the phrase is only an Activity label).
- c. 21 stickers instead of 46: **refuted at source**, likely cause: the grid scrolls and about 21–24 fit on screen; now labelled "46 stickers · scroll for more".
- d. Pressed look on Create and Journal: **not confirmed** (they had their own v14 rules; the live device was not visible); v15 gives every tile one finish.
- e. "X is X" / "no facts": **confirmed**: ARTEN read only your own notes, never your partner's, and prefixed every line with the name.
- f. Last seen instead of Online: **confirmed at source**: Online relied only on the realtime presence channel.

## R-c. Files changed (against d455926)
- `lees-v12.js`: statusOf with green / blue / red and 12-hour times; one status line.
- `lees-v12.js`: Activity rebuilt as day cards ("Clears on …"), session timeline, filters, detail sheet, Add note via sendText, 10-day hiding, purge_retained_for_me after sign-in and on open.
- `lees-v12.js`: ARTEN page rebuilt: header with ring, New chat / History / Take me to; pinned greeting; floating dock; zoom from and to the flower; swipe down; thinking state and "Thought for" pill; structured answers.
- `lees-v12.js`: ARTEN intents (how-to, navigate, personal, add / edit), phrases, rarer-word weighting, typo tolerance; personal answers from arten_items (v14 notes fallback) with author citations; consent-based adds; refusals for numbers and secrets.
- `lees-v12.js`: conversations in arten_conversations (local fallback), 10-day history view, archive on New chat and sign-out.
- `lees-v12.js`: About me / About [partner] page (add, edit, delete with Cancel / Delete, author and date, 300 / 200 limits); Settings entry renamed.
- `lees-v12.js`: "Show me the steps" guide and step lists for every feature; chip action lists (Profile → Edit name / Edit photo / About me).
- `lees-v12.js`: knowledge base: new and rewritten entries (activity, status colours, chat history, New chat, sign-out memory, chooser, About, stickers, flower, steps), each with eight or more phrasings.
- `lees-v12.js`: flower hiding rules (4.6), and it steps aside while you type in a page field.
- `lees-v12.js`: adaptive rendering tiers (`html[data-perf]`) and flower frame rate per tier.
- `lees-v12.css`: status colours, composer pill, glassy tiles, Activity, Add note, ARTEN page, steps guide, About page and sticker count styles.
- `lees-v12.css`: v15 polish layer (radii, elevations, hairlines, focus ring, press motion, page header, empty states, sheets, banners) and the high / mid / low tier rules.
- `lees-v8.js`: sealed letter chooser as one page (preview, title and letter, To, seals, papers, Open when, gated Seal); same fields and send path; preview time in 12-hour lowercase.
- `lees-v8.css`: chooser styles (52px swatches with a ring, preview card).
- `lees-v9.js`: sticker sheet swipe bound to the visible sheet with release speed from the last 80 ms; "46 stickers · scroll for more".
- `index.html`: composer placeholder "Reply…"; `#presence` gets k-on / k-seen / k-off; cache versions lees-v8.css?v=5, lees-v12.css?v=7, lees-v8.js?v=10, lees-v9.js?v=10, lees-v12.js?v=7.
- `sw.js`: CACHE `lees-shell-v15-3`.
- `.gitignore`: tests/.auth/, tests/harness/shots/.
- `supabase/RUN_THIS_v15.sql`: new, not executed.
- `CHANGELOG.md`: v15 section.
- `tests/`: holdout and runner, harness and scenarios, baseline, discovery, results, contrast data, screenshots.

## R-d. Audit A1–A27
See the table in `tests/v15-results.md`. Summary:
- PASS: A2, A4–A21, A23, A25–A27. Every browser result here is "(local, stand-in backend)".
- PARTIAL: A1 (live lock clean except the sandbox's blocked Supabase host; signed-in live not run), A3 and A22 (one context only), A24.
- NOT RUN parts: everything needing sign-in on the live site (no test passphrase provided), Telegram, voice note, tic-tac-toe move, letter open / delete.

## R-e. Holdout
Baseline 78/150 = **52.0%** → final 146/150 = **97.3%**, an improvement of **+87.2%** relative (target +58%). The misses were printed while fixing general bugs, so the set is no longer blind.

## R-f. Not done, not verifiable, or beyond the spec
- Not verifiable here: any signed-in check on the live site (no test passphrase provided), two-person checks (A3, A5g delivery, A22), Telegram.
- The SQL has not been run. Until it is, About uses the v14 notes, ARTEN history is per-device, and the server keeps old activity (the app hides it).
- Owner-requested beyond the spec:
  - Composer as the screenshot's pill, with placeholder "Reply…" because the mic is tap-to-record, not hold-to-talk.
  - The overnight premium polish pass.
  - Adaptive rendering by device capability (manual override: `localStorage["lees-perf"]` = "high", "mid" or "low").
- Small additions found while testing: the flower hides under the Activity detail / Add note sheets, the centred banner, and while typing in a page field; the Activity Top button moved to the left so it never meets the flower; the v14 sticker swipe area bug was fixed.
- A new cloud environment, "The-Lees", was created for this session so it could reach the live site and its CDN.

## R-g. supabase/RUN_THIS_v15.sql
Not executed. Run once in the Supabase SQL editor, then run the check selects at the end.

```sql
-- The Lees v15: adds arten_items, arten_conversations and the 10-day retention purge. Safe to run twice. Deletes nothing that is not already past the 10-day rule (activity log and ARTEN chat history only); arten_notes is kept.

-- ---------- 6.1 arten_items ----------
create table if not exists public.arten_items (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  author_side text not null check (author_side in ('Lewis','Agnes')),
  subject_side text not null check (subject_side in ('Lewis','Agnes')),
  body text not null check (char_length(body) between 1 and 300),
  source text not null default 'written' check (source in ('written','arten')),
  status text not null default 'saved' check (status in ('saved','proposed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists arten_items_pair_idx on public.arten_items (pair_id, subject_side);
alter table public.arten_items enable row level security;
revoke all on public.arten_items from anon, public;
grant select, insert, update, delete on public.arten_items to authenticated;
drop policy if exists arten_items_select on public.arten_items;
create policy arten_items_select on public.arten_items for select to authenticated
  using (pair_id in (select public.my_pair_ids()) and (status = 'saved' or author_side = public.my_side()));
drop policy if exists arten_items_insert on public.arten_items;
create policy arten_items_insert on public.arten_items for insert to authenticated
  with check (author_side = public.my_side() and pair_id in (select public.my_pair_ids()));
drop policy if exists arten_items_update on public.arten_items;
create policy arten_items_update on public.arten_items for update to authenticated
  using (author_side = public.my_side() and pair_id in (select public.my_pair_ids()))
  with check (author_side = public.my_side() and pair_id in (select public.my_pair_ids()));
drop policy if exists arten_items_delete on public.arten_items;
create policy arten_items_delete on public.arten_items for delete to authenticated
  using (author_side = public.my_side() and pair_id in (select public.my_pair_ids()));

-- ---------- 6.2 migrate arten_notes (one item per non-empty line; arten_notes is not deleted) ----------
do $$
begin
  if to_regclass('public.arten_notes') is not null then
    insert into public.arten_items (pair_id, author_side, subject_side, body, source, status)
    select n.pair_id, n.owner_side,
           case when n.subject = 'me' then n.owner_side when n.owner_side = 'Lewis' then 'Agnes' else 'Lewis' end,
           left(btrim(l.line), 300), 'written', 'saved'
      from public.arten_notes n
      cross join lateral regexp_split_to_table(n.body, E'\\r?\\n') as l(line)
     where btrim(l.line) <> ''
       and not exists (
         select 1 from public.arten_items i
          where i.pair_id = n.pair_id and i.author_side = n.owner_side
            and i.subject_side = (case when n.subject = 'me' then n.owner_side when n.owner_side = 'Lewis' then 'Agnes' else 'Lewis' end)
            and i.body = left(btrim(l.line), 300));
  end if;
end $$;

-- ---------- 6.3 arten_conversations ----------
create table if not exists public.arten_conversations (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  side text not null check (side in ('Lewis','Agnes')),
  title text not null default '' check (char_length(title) <= 120),
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages) = 'array' and octet_length(messages::text) <= 200000),
  started_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists arten_conversations_user_idx on public.arten_conversations (user_id, started_at desc);
alter table public.arten_conversations enable row level security;
revoke all on public.arten_conversations from anon, public;
grant select, insert, update, delete on public.arten_conversations to authenticated;
drop policy if exists arten_conv_select on public.arten_conversations;
create policy arten_conv_select on public.arten_conversations for select to authenticated using (user_id = auth.uid());
drop policy if exists arten_conv_insert on public.arten_conversations;
create policy arten_conv_insert on public.arten_conversations for insert to authenticated with check (user_id = auth.uid());
drop policy if exists arten_conv_update on public.arten_conversations;
create policy arten_conv_update on public.arten_conversations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists arten_conv_delete on public.arten_conversations;
create policy arten_conv_delete on public.arten_conversations for delete to authenticated using (user_id = auth.uid());

-- ---------- 6.4 purge for the signed-in person ----------
create or replace function public.purge_retained_for_me()
returns void language plpgsql security definer set search_path = public as $$
declare cutoff timestamptz := date_trunc('day', now() at time zone 'utc') - interval '10 days';
begin
  if auth.uid() is null then return; end if;
  if to_regclass('public.activity_log') is not null then
    delete from public.activity_log
     where pair_id in (select public.my_pair_ids())
       and date_trunc('day', at at time zone 'utc') < cutoff;
  end if;
  delete from public.arten_conversations where user_id = auth.uid() and started_at < cutoff;
end $$;
revoke all on function public.purge_retained_for_me() from public, anon;
grant execute on function public.purge_retained_for_me() to authenticated;

-- ---------- 6.5 purge for everyone (scheduler only) ----------
create or replace function public.purge_retained_all()
returns void language plpgsql security definer set search_path = public as $$
declare cutoff timestamptz := date_trunc('day', now() at time zone 'utc') - interval '10 days';
begin
  if to_regclass('public.activity_log') is not null then
    delete from public.activity_log where date_trunc('day', at at time zone 'utc') < cutoff;
  end if;
  delete from public.arten_conversations where started_at < cutoff;
end $$;
revoke all on function public.purge_retained_all() from public, anon, authenticated;

-- ---------- 6.6 daily schedule (skipped quietly if pg_cron is unavailable) ----------
do $$
begin
  create extension if not exists pg_cron;
  begin perform cron.unschedule('lees-retention'); exception when others then null; end;
  perform cron.schedule('lees-retention', '10 3 * * *', 'select public.purge_retained_all()');
exception when others then
  raise notice 'pg_cron not available; the app still purges on sign-in and when Activity opens (%).', sqlerrm;
end $$;

-- ---------- 6.7 checks (read-only). Every value should be true. ----------
select (select relrowsecurity from pg_class where oid = to_regclass('public.arten_items')) as check;
select (select relrowsecurity from pg_class where oid = to_regclass('public.arten_conversations')) as check;
select to_regprocedure('public.purge_retained_for_me()') is not null as check;
select to_regprocedure('public.purge_retained_all()') is not null as check;
select not has_function_privilege('authenticated', 'public.purge_retained_all()', 'execute') as check;
```
