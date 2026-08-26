# Writing a Season 1 episode

One typed module per video, under
[`packages/openthrottle-showroom/src/episodes/`](../../packages/openthrottle-showroom/src/episodes/).
The module is the contract between writing and production: the **narration text
is the literal TTS input** and the **beat action is the literal flow step**, so
the runner transcribes rather than invents.

The shape and the reasoning behind it are in
[`episode-format.md`](./episode-format.md). This file is the craft.

## Shape

```ts
export const episode: VideoEpisode = {
  beats: [
    { action: 'Terminal. Run `pnpm run setup:mcp-instructions`.', t: '0:00' },
    { action: 'Outro card.', t: '0:53' },
  ],
  format: 'short',
  id: '05-connect-ot-mcp',
  production: {
    blockedOn: [],
    recording: 'live',
    titleCard: ['Connect it to', 'Claude Code'],
  },
  release: { order: 6, playlist: 'getting-started', status: 'draft' },
  selectedVariant: 'payoff-first',
  variants: [
    {
      id: 'payoff-first',
      narration: [
        ['0:00', 'In sixty seconds your agent will be filing plans…'],
      ],
      thesis: 'Promises the outcome up front and closes on what you do next.',
    },
  ],
  youtube: { summary: '…', tags: [/* 6–10 */], title: '…' },
};
```

A **beat** carries the picture. A **variant** carries the words, with its own
timings. Register the episode in `src/episodes/registry.ts` and put the flow
beside it as `flow.ts`.

## Rules

- **~130 spoken words, hard.** 55 seconds at a natural 145 wpm. The word count is
  **computed** — there is no field to keep in sync, and the validator prints the
  number rather than writing it back into your file. Over the budget is a failure,
  no exceptions and no faster TTS.
- **Write for the ear.** Short sentences. One clause each. No bullet-speak, no
  parentheticals, no colons read as pauses.
- **Never read a URL, a flag string or a UUID aloud.** They belong on screen or in
  the description. "The commit carries the task id" — not "the commit carries
  Task-Id colon four-eight-seven-seven…".
- **The action is executable.** "Click the New plan button" is a step; "show the
  plans page" is not. If you cannot write the action as a step, the beat is not
  yet designed.
- **`t` is the beat start**, `mm:ss`, monotonic, first beat at `0:00`. The
  assembly stage treats these as intent, not gospel — actual timings come from
  the runner's manifest — but a beat list that does not add up to under 55s never
  will after recording.
- **Front-load.** The first beat starts at `0:00` with the payoff already on
  screen. No login, no empty state, no "first, let's navigate to".

**The budget is a ceiling, not a target.** Most shorts land 25–35 seconds of
speech across 55 seconds of picture, and that is correct: the gaps are where the
viewer watches the action instead of listening to someone describe it. A short
whose narration fills the entire runtime is over-narrated.

## Variants — writing more than one take

A variant is a different set of **words over the same picture**. Every variant of
an episode shares its beats, so one recording serves all of them: you re-narrate,
you do not re-record. That is the whole economic case for having more than one.

Write a second variant when you want to test **how** the episode opens or closes,
not what it shows. Episode 05 is the worked example, with four:

| Variant         | Thesis                                                                |
| --------------- | --------------------------------------------------------------------- |
| `payoff-first`  | Promises the outcome up front. Slowest, most breathing room. _Ships._ |
| `problem-first` | Leads with the pain — plans evaporate into chat history               |
| `how-it-works`  | Teaches while it demos, for a skeptical audience                      |
| `plainest`      | No hook device; the baseline the other three try to beat              |

Rules for variants:

- **Name the thesis, not the order.** `payoff-first`, not `v3`. The number records
  the day it was written, which is the one fact nobody needs.
- **Every variant needs a `thesis`** once there is more than one. A variant nobody
  can choose between is not a test, and the validator enforces this.
- **A variant owns its timings.** Cues are `['0:09', 'the words']` tuples; a
  slower read may hold its opening two seconds longer. Nothing requires variant
  two to speak at variant one's moments.
- **`selectedVariant` is the one that ships.** Every stage follows it unless
  `--variant` says otherwise.

Rendering two takes:

```bash
pnpm nx run openthrottle-showroom:video-narrate -- --script 05-connect-ot-mcp
pnpm nx run openthrottle-showroom:video-narrate -- --script 05-connect-ot-mcp --variant problem-first
```

They land in `output/05-connect-ot-mcp/payoff-first/` and
`.../problem-first/` and neither overwrites the other. The capture they share
stays at `output/05-connect-ot-mcp/`, and so does the render cache — two takes
that share a sentence share the rendered audio.

## Replay

`recording: 'replay'` marks videos that depend on a **live agent run** — a real
model call, non-deterministic in both content and duration. Recording those live
produces a different video every take and can easily produce a failed take.

Those flows record against a **pre-baked run**: the demo seed lands the run's
output stream in the database already complete, and the flow drives the UI that
renders it. What the viewer sees is real UI over real recorded output; what does
not happen is a model call during the take.

## Blocked episodes

Writing all 24 up front is what surfaces the gaps. `production.blockedOn` is
non-empty on:

| Episode              | Needs                                                     |
| -------------------- | --------------------------------------------------------- |
| `07-semantic-search` | `/search` reachable in a production build                 |
| `16-worktrees`       | Worktree state visible in the UI; today it is a CLI story |

Both stay `draft`. The validator refuses to let a blocked episode be marked
`ready` — a video that shows an aspirational feature is the one mistake the
publish checklist cannot catch after upload.

## Release order

`release.order` is the authority, and the validator fails if two episodes claim
one slot. `pnpm nx run openthrottle-showroom:video-validate` prints the season in
that order.

## Validating

```bash
pnpm nx run openthrottle-showroom:video-validate
```

It prints every episode's word count, estimated speech and budget — computed
fresh — then reports two kinds of finding:

- **Errors** fail immediately: over budget, beats out of order, a duplicate
  release slot, a `selectedVariant` naming nothing.
- **Convention findings** are advisory while an episode is a `draft` and become
  errors once it is `ready` or `published`. The tag baseline is the live example:
  22 of 24 episodes do not carry it yet, and none of them can be marked ready
  until they do.

Long-form is a different problem. `L1` and `L2` are **beat outlines** — roughly
two minutes of speech across ten minutes of picture. The validator flags that on
purpose. Both need their narration fleshed out before recording; neither is close
to `ready`.
