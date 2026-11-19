# Test report - The Lees v11

Method: Playwright (Chromium) against the real index.html and scripts, with a fake Supabase backend shared by two
signed-in browser contexts (Mr Lees and Mrs Lees), so realtime inserts, updates, broadcasts and presence flow between
them. Fake microphone for recording. Desktop 1280x860 and phone 390x844.

Result: 50 of 50 checks passed, 0 console errors on either side.

Covered: sign-in both sides; hover lift on home tiles and settings cards; typing banner in Settings (compact);
recording banner on home, home line, recording bubble in the thread, cleared on stop; six photos → one album card
with +2 and caption; +N opens all six; love from the album → sender gets "liked your photo"; heart on the tile;
forward photo and text (Forwarded label), Forward in the long-press menu; listen-once label, inline playback, pause,
"Played" after the end; mood reaches partner (notice + home tile); game mode in the chat, invite → join, typing
bubble during a game, quick reply lands, + menu has Attach and Draw, draw opens/closes, phone layout leaves room for
the chat with no sideways scroll; self-hosted emoji font loads and renders in colour; every home tile opens and
returns; all 7 settings categories; settings search; Create, letters, trophies, special days; chat search; send.

Not run here (needs the live database or a real device): server-side RLS on the live project, push notifications,
iOS Safari (Apple devices keep Apple's own emoji by design), real two-phone timing.
