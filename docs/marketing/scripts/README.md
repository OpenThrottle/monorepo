# Season 1 scripts

One file per video. The file is the contract between writing and production: the
**narration column is the literal TTS input** and the **action column is the
literal flow step**, so the runner transcribes rather than invents.

## Template

```markdown
---
id: 03-first-plan
title: Your first plan in 60 seconds
format: short # short | longform
status: draft # draft | ready | recorded | published
release: 2 # position in the release order
recording: live # live | replay  (see "Replay" below)
titleCard: ['Your first plan', 'in 60 seconds']
spokenWords: 128
blockedOn: [] # app features this script needs and that do not exist yet
tags: [openthrottle, ai agents, ...]
---

## Beats

| t    | on-screen action | narration |
| ---- | ---------------- | --------- |
| 0:00 | …                | …         |

## Region of interest

Per-beat crop targets for the 9:16 export, when the default (centre on the
active element) is wrong.
```

## Rules

- **~130 spoken words, hard.** 55 seconds at a natural 145 wpm. `spokenWords` in
  the front matter is the count of the narration column; if it is over 135 the
  script is not ready, no exceptions and no faster TTS.
- **Write for the ear.** Short sentences. One clause each. No bullet-speak, no
  parentheticals, no colons read as pauses.
- **Never read a URL, a flag string or a UUID aloud.** They belong on screen or in
  the description. "The commit carries the task id" — not "the commit carries
  Task-Id colon four-eight-seven-seven…".
- **The action column is executable.** "Click the New plan button" is a step;
  "show the plans page" is not. If you cannot write the action as a step, the beat
  is not yet designed.
- **t is the beat start**, mm:ss, monotonic. The assembly stage treats these as
  intent, not gospel — actual timings come from the runner's manifest — but a beat
  list that does not add up to under 55s never will after recording.
- **Front-load.** The first beat starts at 0:00 with the payoff already on screen.
  No login, no empty state, no "first, let's navigate to".

## Replay

`recording: replay` marks videos that depend on a **live agent run** — a real
model call, non-deterministic in both content and duration. Recording those live
produces a different video every take and can easily produce a failed take.

Those flows record against a **pre-baked run**: the demo seed lands the run's
output stream in the database already complete, and the flow drives the UI that
renders it. What the viewer sees is real UI over real recorded output; what does
not happen is a model call during the take.

Season 1 replay videos: 11, 12, 14, 15, and the middle act of L1.

## Blocked scripts

Writing all 24 up front is what surfaces the gaps. `blockedOn` is non-empty on:

| Script                   | Needs                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| `15-kill-runaway-run.md` | Cancel/kill controls on a running plan run — designed, not shipped |
| `16-worktrees.md`        | Worktree state visible in the UI; today it is a CLI story only     |

Do not mark those `ready`. A video that shows an aspirational feature is the one
mistake the publish checklist cannot catch after upload.

## Release order

`1 → 3 → 2 → L2 → 11 → 5 → 21 → 4 → 7 → 17 → 13 → 6 → 19 → 14 → 8 → 10 → 20 →
9 → 12 → 18 → 22 → L1 → 16 → 15`, roughly two per week. The `release` field in
each file's front matter is the authority; this list is the human-readable copy.

## Validating

```bash
pnpm exec tsx ./scripts/validate-video-scripts.ts
```

It parses every beats table, counts the narration words, rewrites `spokenWords`
in the front matter, and fails any short over the budget derived from
`../format.json` (145 wpm against the 55-second target = 132 words). `--check`
validates without rewriting, for CI.

**Fill the runtime — the budget is a target band, not just a ceiling.**
Superseded deliberately on 2026-08-25 by the Season 1 narration rewrite
(`SEASON-1-NARRATION.md`): this section previously said the budget was "a
ceiling, not a target" and that a short filling its runtime was over-narrated.
That guidance produced takes like `01` at 101 words — roughly 42 seconds of
speech in a 55-second video with a quiet back third — and the house style is
now the opposite. Shorts target **115–132 spoken words** (the ceiling is still
145 wpm × 55 s = 132, from `../format.json`; the floor is 110, below which a
take is under-narrated). Long-form targets **1,200–1,400 words per narration
track**. Silence is still allowed where the action is doing the explaining —
it is no longer the default. The full derivation and the voice charter live in
`SEASON-1-NARRATION.md`, which is the current word-budget authority.

Long-form history: `L1` and `L2` were **beat outlines** — one narration line
per beat, roughly two minutes of speech across ten minutes of picture — and
the validator warned about that on purpose. Their filled narration tracks
(three per episode) live in `SEASON-1-NARRATION.md`.
