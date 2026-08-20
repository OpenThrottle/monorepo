# The pipeline

One command per stage, each independently runnable so a narration tweak does not
force a re-record.

```
seed  →  record  →  narrate  →  assemble  →  (review)  →  upload
```

Everything lives in
[`applications/openthrottle-developer/tests/demo/`](../../applications/openthrottle-developer/tests/demo/README.md)
and reads its constants from [`format.json`](./format.json).

## Stages

### 1. Seed

```bash
sh applications/openthrottle-developer/tests/demo/scripts/seed-demo.sh --reset
```

Creates and migrates the **demo database** and fills it with fictional content.
`--reset` first, always: flow 03 creates a real plan every time it runs, so take 7
looks like take 1 only if the workspace is reset in between.

### 2. Record

```bash
pnpm exec tsx applications/openthrottle-developer/tests/demo/runner/run.ts \
  --flow 03-first-plan --base http://localhost:7180
# and, for a Short:
pnpm exec tsx .../runner/run.ts --flow 03-first-plan --base http://localhost:7180 --portrait
```

Out: `output/<flow>/frames/`, `frames.concat` (per-frame durations) and
`manifest.json` (per-step `tStart`/`tEnd`, plus where the action was on screen).

**Record the portrait pass for anything destined to be a Short.** Reframing a
1920-wide capture into 9:16 is a compromise either way — cropping clips a table at
both edges, fitting shrinks the text past readable — and it is not a marginal
difference when you look at the two side by side. A second capture at 1080×1920 lets
the app's own responsive layout do the work.

### 3. Narrate

```bash
pnpm exec tsx applications/openthrottle-developer/tests/demo/narrate/narrate.ts \
  --script 03-first-plan
```

Out: `output/<slug>/audio/*.wav` + `timings.json`. See
[`NARRATION.md`](../../applications/openthrottle-developer/tests/demo/NARRATION.md) —
the ship voice is still an open decision, and the current default is a rehearsal
voice.

### 4. Assemble

```bash
pnpm exec tsx applications/openthrottle-developer/tests/demo/assemble/assemble.ts \
  --script 03-first-plan [--music bed.mp3]
```

Out: `<slug>-16x9.mp4`, `<slug>-9x16.mp4` (captions burned in), `<slug>.srt`, and
`metadata.json` with the title, description and tags for upload.

## What assembly actually does

- **Aligns narration to picture** using the step manifest. Where a beat's narration
  runs longer than its action, it **holds the last frame of that beat** rather than
  speeding the picture up.
- **Burns the lower third** (Shorts have no title card) and appends the shared 2s
  outro.
- **Generates captions** — burned into the 9:16 master, plus an `.srt` sidecar.
- **Reframes 9:16** from a portrait capture when one exists; otherwise per the
  flow's `portraitStrategy` (`crop` follows the per-beat region of interest, `fit`
  letterboxes).
- **Mixes an optional music bed** at `musicBedDb` under narration, ducked while
  anyone is speaking. Off by default — see below.
- **Encodes** H.264 high profile, CRF 18, yuv420p, faststart, AAC 192k, stereo.

## Three environment facts worth knowing

**This ffmpeg has no `subtitles` and no `drawtext`.** The Homebrew build lacks both
libass and libfreetype, so of the text-capable filters only `overlay` exists.
Captions and cards are therefore typeset in the same headless Chromium that records
the screencast and composited as PNG plates. That is not a workaround to be undone
later — it means cards and captions share the footage's font stack, which a separate
rasteriser would not.

**No SVG rasteriser is installed either** (no `rsvg-convert`, `resvg`, ImageMagick or
Inkscape). Same answer, same reason.

**No music bed is checked in.** `--music` takes a path and the ducking chain works,
but shipping a licensed track is a licensing decision, not a code one. A video with
no bed is perfectly publishable; a video with an unlicensed bed is not.

## Nx targets

The pipeline runs the way everything else in this repo runs. Each stage is
independently runnable, so a narration tweak never forces a re-record:

```bash
pnpm nx run openthrottle-developer:video-seed     --args="--reset"
pnpm nx run openthrottle-developer:video-record   --args="--flow 03-first-plan --base http://localhost:6020"
pnpm nx run openthrottle-developer:video-record   --args="--flow 03-first-plan --base http://localhost:6020 --portrait"
pnpm nx run openthrottle-developer:video-narrate  --args="--script 03-first-plan"
pnpm nx run openthrottle-developer:video-assemble --args="--script 03-first-plan"
```

**None of them are cached**, and that is deliberate — see
[`catalogue-rebuild.md`](./catalogue-rebuild.md) for the reasoning per stage. The
short version: seed mutates a database, record reads live app state, narrate shells
out to a TTS backend, and assemble consumes gitignored artifacts Nx cannot hash,
where a stale hit would silently publish last week's footage.

`video-seed` pins `POSTGRES_HOST=localhost` in the target, because Nx loads the
project's `.env` into the task and the app's `.env` points Postgres at
`host.docker.internal` — which does not resolve outside a container.

## Re-recording the catalogue

When the UI changes, every published video silently goes stale.
[`catalogue-rebuild.md`](./catalogue-rebuild.md) is the scheduled answer, including
why it is documented rather than switched on yet.
