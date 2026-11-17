# Test report - The Lees, final v4 (round 5, cache-bust ?v=9)

## What was run
Environment: no real browser was available to the build. Checks are:
- (A) jsdom boot: the full page loads with Supabase stubbed and the app's own scripts run. Counts console errors and uncaught exceptions.
- (B) jsdom sign-in flow: scripted interaction on the lock screen. Account switch, lens on blinded marks, passphrase privacy, wrong and right paths.
- (C) Node numeric test of the boomerang oval path.
- (D) Static inspection of the code (grep, syntax checks).

Nothing was seen moving on a screen. Every animation, layout, and visual result is NOT RUN until a person checks it on a phone and a desktop.

## Results
| Area | Test | Method | Result |
|---|---|---|---|
| Boot | Zero console errors, uncaught exceptions | A | PASS (0 errors) |
| Boot | Lock screen shows tagline, no "Welcome back", no lock "Notes" heading | A | PASS |
| Lock | Only one account switch; no .sides picker, no #toBottom element | B | PASS |
| Lock | Sign-in art has arms (pose cycle) | B | PASS |
| Sign-in | Choosing an account shows the passphrase form | B | PASS |
| Sign-in | One lens mark per passphrase character, all bullets | B | PASS |
| Sign-in | Passphrase characters never appear in the page text | B | PASS |
| Sign-in | Lock blurs and art dims while checking | B | PASS |
| Sign-in | Wrong password: lens removed, blur cleared, no welcome, input restored | B | PASS |
| Sign-in | Right password: welcome "Welcome, <name>" after the lens finishes; lens cleared | B | PASS |
| Sign-in | No console errors through the flow | B | PASS |
| Boomerang | Oval path starts and ends on the button; nose at rest at start; one full turn; no rotation or position jumps; stays near the button | C | PASS |
| Boomerang | Plays for Enter and for the button; only after 5 minutes per side | D | PASS (code path unchanged this round) |
| Divider | One "New messages" divider (.newline) | D | PASS (lp-divider removed) |
| Typing | Outside chat: home subtitle and banner. Inside: thread bubble, tray | D | PARTIAL (code wired; live behaviour NOT RUN) |
| Send | Long-press Send opens schedule actions, not Effects; + menu has attach and record only | D | PASS |
| Settings | Sign-in object choice saved and mirrored locally | D | PARTIAL (not exercised: settings sheet needs unlock) |
| Settings | Label inline with icon; sign-out red block; Vibration under Haptics | D | NOT RUN (visual) |
| Media | Type chooser, lifting cards, delete, archive, resend | D | PASS in code (existing panel). Shown as a panel, not a popup |
| Media | Draft plus recording goes as one message | D | PASS in code (heldClip path in sendText). Live NOT RUN |
| Shield | Long press toggles, no copy menu on desktop | D | NOT RUN (live) |
| Ghost mode | Hides messages; search, action bar, edit, unsend work | D | NOT RUN (live) |
| Offline | Offline send queues and sends on reconnect | D | NOT RUN (live; queue untouched) |
| Reduced motion | Final states only (art, lens, morph) | D | PASS in code. NOT RUN (live) |
| Layout | Banner and tray at 390 px and desktop; lock at 390 px with the larger type | - | NOT RUN |
| Art | Sign-in art matches IMG_1371.jpg | - | NOT POSSIBLE: image not supplied. The art is this build's own drawing |
| Art | Pale Newest bar (IMG_1374.jpg) not on screen | D | PASS: no pale bar exists. The tray is the only control |

## Counts
- Automated and code-level PASS: 22
- PARTIAL: 2
- NOT RUN (needs a real device): 8
- NOT POSSIBLE here: 1 (reference art)

## Known gaps to read before publishing
- The sign-in art is an original drawing to the described brief, not a trace of the reference image.
- Lock-screen type is 1.5 times. The rest of the app keeps its current sizes, by design.
- The "New messages" divider fades out only when the page re-renders (existing behaviour).
