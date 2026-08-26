# @OpenThrottleAI · the "0–60" video format

The channel's whole premise is that OpenThrottle is fast to understand and fast
to run, so the format is short, faceless screencasts of the real app. There is
**no on-camera presenter and no video editor** — every video is produced by a
pipeline (see [`pipeline.md`](./pipeline.md)), so the format has to be a set of
constants a script can read, not a set of tastes a human applies.

**Machine-readable constants live in [`format.json`](./format.json).** That file
is the source of truth for every number below. The runner, the narration stage
and the ffmpeg assembly stage all read it; nothing hard-codes a resolution, a
LUFS target or a safe-area inset. When you change a number here, change it there
in the same commit.

---

## The one hard rule

**One idea per video.** If a script needs two ideas to make sense, it is two
videos. This is the rule that keeps a 60-second format honest — the failure mode
of a demo channel is a five-minute tour that teaches nothing, and it always
starts as "well, I also need to show…".

Corollary: if a beat exists only to set up another beat, the video is starting in
the wrong place. Cut to the payoff.

## Shorts — the workhorse

| Property   | Value                                                      |
| ---------- | ---------------------------------------------------------- |
| Duration   | ≤ 60s hard cap; **target 55s** (leaves room for TTS drift) |
| Primary    | 1080×1920 (9:16), 30fps                                    |
| Secondary  | 1920×1080 (16:9), 30fps — the main-feed export             |
| Captions   | Burned in on the 9:16 master, plus a sidecar `.srt`        |
| Title card | **None.** No bumper, no logo sting, no "hi and welcome"    |
| Outro      | The shared 2s outro card, identical on every video         |

### Beat structure

```
0–3s     HOOK      The payoff is already on screen. Hard cut in, mid-action.
3–50s    BODY      The single idea, one continuous click-path, no cuts to black.
50–60s   OUTRO     Result held on screen → 2s outro card.
```

The hook is the only beat with a rule about content rather than time: **at t=0
the frame must already show the thing the title promises.** Not the login page,
not an empty dashboard, not a terminal about to run something. If the title says
"Your first plan in 60 seconds", frame 1 shows a plan.

Recording starts _after_ seeded state is in place and the app is on the right
route (see the demo seed script) — the pipeline never records a navigation
warm-up and trims it later.

### Why 55 and not 60

TTS length is not fully predictable, and the assembly stage extends dwell on the
last frame of a beat when narration runs long rather than speeding the picture
up. A 55s target absorbs that drift; a 60s target means the cap gets breached by
a second and YouTube reclassifies the upload.

**Gate:** read the narration aloud against a stopwatch. Over 55 seconds spoken →
cut words. Never raise the TTS rate to fit; sped-up narration is the single most
recognisable "this was automated" tell.

## Long-form — rare, deliberate

| Property   | Value                                             |
| ---------- | ------------------------------------------------- |
| Duration   | 5–12 min                                          |
| Resolution | 1920×1080 (16:9), 30fps                           |
| Chapters   | Required — YouTube chapter markers in description |
| Title card | 2s title card (long-form only)                    |
| Thumbnail  | Required — from the template below                |

Only two are planned for Season 1 (the flagship idea→plan→tasks→commit walkthrough
and a setup-from-scratch piece). Long-form is where setup and narrative live;
everything else is a Short.

### Why 30fps and not 60

The spec started at 60. The task-3 recording spike proved no browser-capture path
delivers a true 60fps: Playwright's `recordVideo` is locked to 25fps VP8 with no
knob, and a CDP screencast emits frames only when the page changes, so its rate is
a property of the content rather than a setting.

30fps constant is the honest number, and it is the right one anyway. A dashboard
screencast is text plus discrete state changes; the only continuous motion is the
synthetic cursor and a few CSS transitions. Nothing in that benefits from 60fps,
and doubling the frame count doubles capture disk for no visible gain.

### The app must be recorded in dark mode

Headless Chromium defaults to the light theme, and the cards in `assets/` are
designed on the brand near-black. The runner sets `colorScheme: 'dark'` on the
browser context (`format.json` → `recording.colorScheme`) — this is not a
preference, it is what keeps the overlays from fighting the footage.

## Safe areas

The Shorts player draws its own UI over the frame. Content that lands under it is
content nobody sees.

**Portrait (1080×1920):** keep meaningful content out of the bottom **15%**
(288px — title, channel, description), the right **14%** (151px — the like /
comment / share rail), the top **8%** and the left **4%**.

**Landscape (1920×1080):** a uniform 5%/4% inset is enough; the only overlay is
the scrubber.

Practically: the 9:16 crop is **not a centre crop**. Each flow declares a region
of interest per beat and the assembly stage crops to follow the action, keeping
the active element inside the portrait safe box. A centre crop of a 1920-wide
dashboard puts the sidebar and half the content off-frame.

## Title card, lower third, outro

Assets are checked in under [`assets/`](./assets/) as SVG, rendered to PNG at
build time by the assembly stage (`assets/README.md` has the render commands).

- **Lower third** ([`lower-third.svg`](./assets/lower-third.svg)) — appears at
  1.5s, holds 3s, fades. Carries the video title and nothing else. It exists
  because Shorts have no title card: the viewer needs the claim in text while the
  narration is still on its first sentence.
- **Outro card** ([`outro-card.svg`](./assets/outro-card.svg)) — 2s, identical on
  every video, no animation beyond a fade. `openthrottle.ai` over the repo URL on
  the brand near-black. Repetition is the point; it is the only branding moment
  in a Short and it has to be recognisable at a glance.
- **Title card** ([`title-card.svg`](./assets/title-card.svg)) — long-form only,
  2s, video title plus season/episode.

## Thumbnails

Long-form only. Shorts use a frame from the video (YouTube picks or you pick, but
never a custom card — a designed thumbnail on a Short reads as an ad).

Template: [`assets/thumbnail-template.svg`](./assets/thumbnail-template.svg),
1280×720. Rules: at most **four words**, set in the brand sans at ≥ 120px so it
survives the mobile sidebar render; a real screenshot behind a near-black scrim
at 70%; the red rule top-left. No faces, no arrows, no circled UI, no expression
of surprise.

## Titles, descriptions, tags

> Most of this section is **machine-enforced**. `video-validate` checks title
> style, the tag baseline and count, the playlist, chapter placement and
> thumbnail word count against
> [`src/validate/rules.ts`](../../packages/openthrottle-showroom/src/validate/rules.ts).
> Structural rules fail immediately; these conventions are advisory on a draft and
> become errors once an episode is marked `ready`. What stays judgement: whether
> the title is _true_ of the video, and whether the words are worth hearing.

**Titles** — plain, literal, and matching the demo exactly. The video must
demonstrate the claim in the title; that is a publish-gate item, not a
preference.

- Shorts: `<What you get> in 60 seconds` or `<Verb the thing>` — e.g.
  "Your first plan in 60 seconds", "Kill a runaway agent run".
- Long-form: `OpenThrottle in 10 minutes: idea → plan → tasks → shipped commit`.
- No clickbait patterns: no "you won't believe", no all-caps, no leading emoji.

**Description** — the per-video paragraph, then the standard block verbatim:

```
<One or two sentences: what this video shows, in plain language.>

OpenThrottle is an open-source planning and execution substrate for coding
agents: plans and tasks as first-class data, agent runs you can watch, and every
commit traced back to the task that caused it.

Repo:    https://github.com/OpenThrottle/monorepo
Docs:    https://github.com/OpenThrottle/monorepo/tree/main/docs
License: Apache-2.0

Chapters:            <long-form only>
00:00 …
```

Never read a URL aloud in narration — it wastes seconds of a 55-second budget and
sounds like a robot. URLs live in the description and on the outro card.

**Tags** — 6–10, no keyword stuffing. Baseline set every video carries:
`openthrottle`, `ai agents`, `coding agents`, `developer tools`, `open source`.
Then 1–5 specific to the video (`claude code`, `mcp`, `cron`, `monorepo`, `nx`).

## Channel identity

- **Handle:** `@OpenThrottleAI`
- **Avatar** — [`assets/channel-avatar.svg`](./assets/channel-avatar.svg), 800×800.
  The brand mark on near-black. Must read at 24px.
- **Banner** — [`assets/channel-banner.svg`](./assets/channel-banner.svg),
  2560×1440 with the 1546×423 "safe" centre carrying the wordmark and tagline;
  everything outside it is crop-tolerant.
- **Tagline:** _Ship faster with agents that actually know what they're building._
- **About copy:**

  > OpenThrottle is an open-source substrate for working with coding agents:
  > plans and tasks as real data, agent runs you can watch live, and every commit
  > traced back to the task that caused it. This channel is short, no-fluff
  > screencasts of the real thing — mostly 60 seconds, occasionally longer when
  > setup deserves it. Apache-2.0, self-hostable, no signup to try.
  >
  > Repo: github.com/OpenThrottle/monorepo

- **Channel trailer:** Short #1, _"What is OpenThrottle in 60 seconds"_. The
  trailer should be the shortest possible answer to "what is this", not the
  flagship long-form — a returning-visitor trailer that costs 10 minutes gets
  skipped.

## Audio levels

Narration is normalised to **-14 LUFS integrated** (YouTube's target) with a
**-1.0 dBTP** ceiling, and the music bed sits about 28 dB under narration.

The peak ceiling is not cosmetic. At -1.5 dBTP the ceiling binds before the
loudness target is reached — a measured take landed at -15.3 LUFS because raising
it further would have breached the peak. -1.0 dBTP is a standard safe delivery
ceiling and lets a take reach -14.3.

Loudness is measured **once per take** and the same gain applied to every clip.
Normalising each sentence independently is wrong twice: integrated LUFS is
meaningless below about three seconds, and per-clip gain flattens the relative
level between sentences, which is what makes narration sound like a person rather
than a series of announcements. What must be consistent is the level _between
videos_.

## Colour and type

Taken from the app's own dark theme (`packages/react-router-shadcn/src/theme.css`)
so cards never clash with the footage behind them:

| Token      | Value     | Use                                  |
| ---------- | --------- | ------------------------------------ |
| red        | `#FF0000` | The single accent. Rules, marks only |
| background | `#0A0D0F` | Card grounds, scrims                 |
| card       | `#13171B` | Raised panels                        |
| border     | `#20262D` | Hairlines                            |
| foreground | `#F7F9FA` | Primary text                         |
| muted      | `#7C8892` | Secondary text                       |

Type: the brand sans for all card text; the mono face **only** for literal
commands and identifiers. Never set narration text or titles in mono.

## Conventions summary

Every published video has, in the repo:

1. A committed episode module —
   [`src/episodes/<id>/episode.ts`](../../packages/openthrottle-showroom/src/episodes/)
   (the narration is the literal TTS input).
2. A committed flow beside it, `flow.ts`, which the runner executes.
3. Generated captions (burned-in for Shorts, `.srt` sidecar for upload).
4. A `metadata.json` complete enough to paste into an upload form.

If any of those four is missing, the video is not shippable — see
[`publish-checklist.md`](./publish-checklist.md).
