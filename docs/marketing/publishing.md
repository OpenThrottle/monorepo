# Publishing

Release order, cadence, metadata, and the upload-automation decision.

## Cadence: two a week, sustained

Consistency beats volume on a new channel. Two a week you can keep up indefinitely
beats eight in one week followed by silence — the second pattern teaches the
algorithm and the audience that the channel is abandoned.

Two a week also matches what the pipeline can actually sustain: roughly 8–9 minutes of
machine time per video once its flow exists, but tens of minutes of human authoring
per new flow. The flow is the bottleneck, not the rendering.

## Release order

`release.order` on each episode module is the authority, and `video-validate` fails
if two episodes claim one slot. In order:

| #    | Video                                             | Why here                                                            |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------- |
| 1    | `01-what-is-openthrottle`                         | The trailer. Shortest possible answer to "what is this"             |
| 2    | `03-first-plan`                                   | The first thing a new viewer would do                               |
| 3    | `02-one-command-boot`                             | Removes the "can I even run it" objection                           |
| 4    | `L2-setup-from-scratch`                           | For the people the last one converted                               |
| 5    | `11-ralph-one-task`                               | The payoff: agents doing the work                                   |
| 6    | `05-connect-ot-mcp`                               | How to get there from their own editor                              |
| 7    | `21-dashboard-tour`                               | Orientation, once they have something to look at                    |
| 8–21 | 4, 7, 17, 13, 6, 19, 14, 8, 10, 20, 9, 12, 18, 22 | Breadth                                                             |
| 22   | `L1-idea-to-shipped-commit`                       | The flagship, last: hardest to make, most needs the pipeline proven |
| 23   | `16-worktrees`                                    | Terminal-only until worktrees are visible in the UI                 |
| 24   | `15-kill-runaway-run`                             | Kill exists; graceful cancel does not                               |

Publishing the flagship last looks backwards and is deliberate. It is ten minutes
long, depends on a replayed run, and is the video where a rough voice or a stale UI
would hurt most. It should ship after the format has been proven twenty times.

## Playlists

Four, mirroring the script groups: **Getting started**, **The planning substrate**,
**Execution**, **Interfaces & developer experience**. Long-form goes in whichever
playlist matches its subject rather than a separate "long videos" bin — viewers sort
by topic, not by duration.

## Metadata

Never retyped. `metadata.json` is produced by the assembly stage from the episode
module, so the title on YouTube cannot drift from the title the video was built to
demonstrate. The bar is that it could be pasted into an upload form with nothing
left to fill in by hand:

```json
{
  "title": "Your first plan in 60 seconds",
  "description": "…one paragraph, then the standard block, then chapters…",
  "tags": ["openthrottle", "ai agents", "coding agents", "…"],
  "playlist": "getting-started",
  "chapters": [],
  "thumbnail": null,
  "captions": "03-first-plan.srt",
  "portrait": "03-first-plan-9x16.mp4",
  "landscape": "03-first-plan-16x9.mp4",
  "episode": "03-first-plan",
  "variant": "only",
  "spokenWords": 93,
  "status": "draft",
  "publishable": false,
  "publishBlockedBy": ["status is 'draft', not ready"]
}
```

`publishable` is a field rather than a hard failure of the assembly step:
assembling a draft to watch it back is the normal case, and every episode in
Season 1 is a draft. What it prevents is a draft being uploaded unnoticed —
`publishBlockedBy` names the missing feature or the status.

Description and tag conventions live in [`youtube-format.md`](./youtube-format.md).
Upload the `.srt` with every video — Shorts autoplay silently, and the burned-in
captions do not help search.

## Cross-posting and docs

- The same 9:16 master goes to any other short-form surface unchanged. It carries no
  YouTube-specific branding, by design.
- **Embed the matching Short in the `docs/` page it explains.** These are
  documentation as much as marketing: "Your first plan in 60 seconds" belongs on the
  getting-started page, and a video that earns its keep twice is worth twice as much.
  Do that as each one publishes, not as a later sweep.

## Upload automation: not yet, and here is the trigger

The YouTube Data API can take `metadata.json` and schedule uploads. **Keep uploads
manual until the pre-publish checklist has caught at least one real problem.**

It already has. The pilot's script claimed a linked-commit view with the task id in
its footer — a surface that does not exist in the app. That is precisely the failure
mode the checklist exists for, it was in the first video, and it was caught by a human
reading the script against the app rather than by any automated check. An automated
uploader would have published it.

So the bar is met once, and the recommendation still stands: **manual until the
checklist has caught a second one.** The ship voice is no longer part of the gate —
narration renders through hosted Fish Audio, the voice the channel actually ships. What remains is asymmetry, not caution: an automated pipeline that can
publish to the world without a human is a larger risk than the fifteen minutes it
saves per video.

When it is time, automate the _upload_, never the _decision_: the job should stage a
video as **private** with its metadata and captions attached, and a human flips it
public. That keeps the whole win (no retyping, no wrong file, no missing captions)
without the irreversible part.

## What "done" means for Season 1

Season 1 is done when:

- Every script is `published`, `blockedOn` is empty for all of them, and the two
  blocked ones (worktrees, graceful cancel) either shipped or were consciously cut.
- A scheduled catalogue rebuild exists and has caught at least one UI drift. Today
  re-recording is manual — see [pipeline.md](./pipeline.md) § Re-recording the
  catalogue.
- The channel has enough watch data to say which _format_ worked, not which topic —
  60s versus long-form, tour versus single-idea.

**Season 2 is triggered by data, not by the calendar.** If the shorts hold audience
and the long-form does not, Season 2 is all shorts. If a specific topic outperforms,
Season 2 goes deeper there. Deciding the next 24 videos before reading the first 24's
retention is how channels end up making videos nobody asked for — which is the same
mistake as writing a plan with no tasks.
