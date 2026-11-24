# DESIGN.md

## Principles
- Calm, warm and private: paper-like surfaces, soft glass, one accent colour per theme.
- Premium means consistent: the same radii, elevations, hairlines, focus ring and press motion everywhere.
- Every text colour at least 4.5:1 against what is actually rendered (glass included), in every theme.
- Touch targets at least 44px. Times always 12-hour with lowercase am/pm ("6:18 pm"), dates as "Monday 23 November".
- Motion is short and eased; `prefers-reduced-motion` turns decorative motion off.

## Theme tokens (`index.html`, `[data-theme=…]` on `<html>`)
`--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--line-strong`, `--accent`, `--accent-ink`, `--mine`,
`--theirs`, `--shadow`, fonts `--sans`, `--serif`, `--mono`. Dark themes: `ink`, `glass`, `forest-ink`,
`night-bloom` (status colours switch to light variants there).

## v15 polish layer (bottom of `lees-v12.css`)
Scoped to signed-in surfaces only (`#home`, `#chat`, `#panel`, `#sheet`, `.cb-scrim`, `.act14`, `.ar15`, `.an15`,
`.st15`); the lock screen is deliberately not restyled.
- Radii `--p-r1..4` = 12 / 16 / 22 / 28px.
- Elevations `--p-e1` (rows, chips), `--p-e2` (cards), `--p-e3` (sheets, banners, steps card); darker in dark themes.
- Hairline `--p-hair`, focus ring `--p-ring`, press motion `--p-press` (scale 0.97).
- Buttons: filled ones get a faint top sheen; ghost ones a hairline. Inputs: calm surface, accent ring on focus.
- Page header frosted with a hairline; cards and grouped rows with dividers; empty states with a haloed icon.
- Pages keep 104px under their last row so the ARTEN flower never sits on the final item.

## Composer
One floating pill: grey round + (left), the field ("Reply or hold to talk"), grey round microphone, solid dark
round send (its icon dims when there is nothing to send). ARTEN uses the same pill with only send.

## Backup book
A4 pages in the app theme (`--bg`, `--surface`, `--ink`, `--muted`, `--line`, `--accent`), Georgia headings,
cards and tables; the conversation box uses the chat theme read from rendered bubbles (mine / theirs colours and
radius). Times 12-hour, dates "Tuesday 24 November 2026".

## ARTEN "Ask" slide
After 3 s idle: flower `translateX(-74px)` (0.45 s), an accent pill reading "Ask" scales in where it was, holds
2.2 s, slides back. Disabled with reduced motion.

## Status colours (4.1)
Light themes: green `#116a3a`, blue `#0a4fc4`, red `#b00020`. Dark themes: `#7ee8a8`, `#9cc2ff`, `#ff9a8f`.
Measured 5.58:1 or better (`tests/v15-contrast-auto.json`).

## Home tiles (4.2)
Accent tint 24% over the surface, `backdrop-filter: blur(14px) saturate(170%)`, inset top highlight, soft outer
shadow, lighter accent border. Measured 8.96:1 or better in Warm Paper, Ink Night and Sage Morning.

## Adaptive rendering (`html[data-perf]`, lees-v12.js `Perf`)
Decided at boot from: `navigator.deviceMemory`, `hardwareConcurrency`, `connection.saveData` / `effectiveType`,
`prefers-reduced-motion`, `prefers-reduced-transparency`, `devicePixelRatio`, and a 24-frame timing probe.
- **low**: Save-Data, 2G, ≤2 GB memory, ≤2 cores, or frames slower than 28 ms. No backdrop blur anywhere, flat
  shadows, no decorative animation, fewer love-burst particles, flower at 12 fps without rings.
- **high**: ≥6 GB memory (or unknown, as on iPhone), ≥6 cores and frames under 19 ms. Full glass and motion,
  card entrance animation.
- **mid**: everything else. Lighter tile blur (8px), lighter sheet shadow, flower at 24 fps.
- Reduced motion or transparency caps a strong device at mid and a weaker one at low.
- Override for testing: `localStorage.setItem("lees-perf", JSON.stringify("low"))` then reload.

## Components to reuse
`centredBanner` (confirmations), `notice` (toasts), `openPanel` (pages), `sheetOpen` (bottom sheets),
`.v9-seg` (segmented control), `.v9-empty` (empty state), `.btn` / `.btn.ghost` / `.btn.sm`, `.chip`, `.srow`
(settings row), `Steps.start(list, title)` (spotlight guide).
