# Spike: which recorder? (task 3)

**Verdict: path B — Playwright — and specifically a CDP screencast resampled to a
constant 30fps, not Playwright's `recordVideo`.** Maestro stays in the repo as the
E2E correctness gate, but it is not the demo driver, and it is currently red for
unrelated environmental reasons (see below).

This directory holds the two spike artifacts so the decision is auditable. It is
not the production runner — that is task 5, built one directory up.

## What was actually run

Both paths drove the same reference demo against a **production build** of
`openthrottle-developer` (`react-router-serve`, port 7180) with the real GraphQL
server on 7181: sign in → create a plan → see it in the plans list.

- `recorder-a-maestro.yaml` — path A driver (tagged `wip` so it stays out of the
  suite).
- `recorder-b-playwright.mjs` — path B, with `--cdp` selecting the screencast
  variant over `recordVideo`.

## Path A: Maestro + external screen capture — rejected

**The capture half does not work unattended.** `ffmpeg -f avfoundation -i "4"`
(«Capture screen 0») for a two-second test hung indefinitely and produced no file:
macOS gates screen capture behind an interactive Screen Recording grant per
binary. A recorder that needs someone to click a system dialog is not a pipeline.
Beyond that it is macOS-only, cannot run headless, and captures the **entire
desktop** — which is a leak vector pointed directly at the control task 9 exists
to build.

**The driver half does not work either, right now.** `recorder-a-maestro.yaml`
failed on its first assertion, and Maestro's debug log shows a hard crash inside
its own web driver:

```
maestro.drivers.CdpWebDriver.deviceInfo(CdpWebDriver.kt:200)
java.lang.NullPointerException: null cannot be cast to non-null type kotlin.Int
```

Maestro Web (Beta, CLI 2.0.9) cannot read the view hierarchy in this environment
at all. **The committed `tests/e2e/flows/smoke.yaml` fails the same way** — so this
is pre-existing breakage, not something this work introduced, and it is out of
scope here. It does mean "Maestro remains the correctness gate" is currently a
statement about intent rather than a working gate.

Even with both halves healthy, path A still has no cursor, no easing, no
hold-on-frame, and no step→time manifest. Those are not polish; they are the
difference between a screencast and a robot.

## Path B: Playwright — accepted

Ran clean, headless, twice, with no flakes. Measured:

|                            | `recordVideo`               | CDP screencast → ffmpeg                      |
| -------------------------- | --------------------------- | -------------------------------------------- |
| Container / codec          | WebM / VP8                  | PNG frames → MP4 / H.264                     |
| Resolution                 | 1920×1080                   | 1920×1080                                    |
| Frame rate                 | **25fps, not configurable** | resampled to a constant **30fps**            |
| Size (~32s)                | 2.4 MB                      | 732 KB final (262 MB of intermediate frames) |
| Text crispness at 1:1      | crisp                       | crisp                                        |
| Hold a frame for narration | no                          | yes — a long frame duration                  |

Text quality is a wash: cropped 1:1 regions from both are legible and free of
scaling artifacts, and the VP8 intermediate did not visibly hurt type. The
decision therefore turns on frame-rate control and pacing, where `recordVideo`
has no knobs at all.

**The frame-timestamp detail is the whole trick.** CDP emits a frame only when the
page changes, so a naive `-framerate N` assembly plays idle stretches fast and busy
stretches slow. The recorder records `frame.metadata.timestamp` per frame and emits
an ffmpeg `concat` list with real per-frame durations; `fps=30` then resamples that
to a constant rate. A deliberate dwell becomes one long-duration frame — which is
exactly the pacing control the format spec asks for and path A cannot give.

Also confirmed working: the synthetic cursor with cubic ease-in-out and a click
ring, and per-character typing at ~50 wpm with jitter.

## What the spike changed in the spec

1. **60fps → 30fps** (`format.json`, `youtube-format.md`). No browser-capture path
   delivers a true 60fps, and a dashboard screencast does not need one.
2. **`recording.colorScheme: 'dark'`.** Headless Chromium renders the app in the
   light theme; every card in `assets/` is designed on the brand near-black. Left
   unset, the overlays fight the footage.
3. **Wait for hydration, not for visibility.** Clicking the login submit button
   before React mounts does nothing at all — no error, no navigation, no POST. The
   runner waits for a hydration marker and then settles. This cost an hour in the
   spike and would have cost a day in the runner.
4. **The production build does not prefill the login form.** `defaultEmail` /
   `defaultPassword` are development-only, so the demo flow must type credentials.
   Playwright types into controlled React inputs fine; Maestro Web famously cannot
   clear them.
5. **A dedicated demo database is mandatory, not an optimisation.** The spike
   recording captured the real dashboard: 834 plans with real internal titles,
   including this very plan. Task 4 cannot solve this with a scoped user.

## Reproducing

```bash
node packages/openthrottle-showroom/spike/recorder-b-playwright.mjs --cdp
```

Then assemble and inspect:

```bash
cd packages/openthrottle-showroom/spike/output/b-cdp
ffmpeg -f concat -safe 0 -i frames.concat -vf "fps=30,format=yuv420p" \
  -c:v libx264 -profile:v high -crf 18 -movflags +faststart cdp-30fps.mp4
```

Artifacts land under `spike/output/` and are gitignored.
