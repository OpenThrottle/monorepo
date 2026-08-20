# Rebuilding the catalogue

The plan's founding constraint is that this **will not scale on human effort**. The
stage where that bites hardest is not making a video — it is the fiftieth time the UI
changes and every published video silently goes stale.

This is the answer: a scheduled run that re-records the whole catalogue against
`main` and flags what changed. It turns re-shooting from a chore nobody remembers
into a notification.

**Documented, deliberately not enabled.** See "Before enabling it" below.

## What it would do

```
for each script with status: published
  video-seed --reset
  video-record  <flow>            # landscape
  video-record  <flow> --portrait # Shorts
  video-narrate <slug>
  video-assemble <slug>
  compare against the published master → flag a visual diff
```

The comparison is the interesting part, and it does not need to be clever. Two cheap
signals catch almost everything:

- **A flow that fails to record at all.** This is the strongest signal and it is
  free: the flow drives real user paths with real selectors, so a failure means a
  user-facing path broke. The demo flows are a de-facto smoke suite, and this is
  where that pays off — especially while the Maestro E2E suite is unusable.
- **A per-beat frame comparison** against the frame that shipped. Beats are named and
  the manifest records when each one ran, so extract one frame per beat from the old
  and new masters and compare. ffmpeg computes a similarity score without extra
  tooling:

  ```bash
  ffmpeg -i old-beat.png -i new-beat.png -lavfi ssim -f null -
  ```

  Anything under about 0.98 is worth a human look. Below 0.9 the video is wrong, not
  merely different.

Flag, never auto-publish. A re-recorded video still has to clear
[`publish-checklist.md`](./publish-checklist.md), and an automated pipeline that can
publish to the world without a human is a bigger risk than the time it saves.

## How it would be scheduled

This repo already has the machinery, so nothing new is needed:

- **A scheduled agent job** (`/schedule` in the dashboard) pointed at a plan whose
  tasks are the rebuild steps. It already supports a cron expression and a repository
  checkout to run in.
- **Or a BullMQ queue** for the per-video fan-out, if the catalogue grows past the
  point where one sequential run finishes overnight.

Weekly is the right cadence to start: often enough that drift is caught while the
change is fresh, rare enough that a false positive is not exhausting.

## Before enabling it

Four things have to be true, and today none of them are:

1. **A published catalogue to compare against.** Right now zero videos are published,
   so there is nothing to diff. The pilot has to ship first.
2. **A locked ship voice.** Re-recording with a different voice than the published
   version makes every video a diff. See
   [`NARRATION.md`](../../applications/openthrottle-developer/tests/demo/NARRATION.md).
3. **Disk budget.** A 20-second capture is ~420 PNG frames at ~60 MB, and every video
   is recorded twice (landscape and portrait). A 24-video catalogue is a few GB per
   rebuild. Frames are intermediate — delete them after assembly, keep the masters.
4. **A dedicated demo database on the runner.** The rebuild truncates and re-seeds
   between videos. Pointed at the wrong database it destroys real work; the guards in
   the seed scripts refuse any database whose name lacks `demo`, and that guard is
   load-bearing here.

## Why the stages are not cached

All four `video-*` targets set `cache: false`, deliberately:

- `video-seed` mutates an external database.
- `video-record` reads live app state.
- `video-narrate` shells out to a TTS backend chosen by env, whose output Nx cannot
  hash.
- `video-assemble` consumes **gitignored** capture artifacts, which are invisible to
  Nx's hashing — the exact shape of a cache-poisoning incident this repo has already
  had once. A stale hit here would silently publish last week's footage.

Per-stage independence is what actually saves the time caching would: a narration
tweak re-runs `video-narrate` and `video-assemble` only, and never re-records.
