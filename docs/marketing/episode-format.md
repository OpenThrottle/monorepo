# The typed episode format

Every video is one typed module. The types live in
[`packages/openthrottle-showroom/src/episodes/types.ts`](../../packages/openthrottle-showroom/src/episodes/types.ts);
this file explains the shape and why it is that shape. For how to _write_ an
episode, see [`writing.md`](./writing.md).

## The shape

```ts
export const episode: VideoEpisode = {
  beats: [
    { action: 'Terminal. Run `pnpm run setup:mcp-instructions`…', t: '0:00' },
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
      narration: [['0:00', 'In sixty seconds…']],
      thesis: 'Promises the outcome up front.',
    },
  ],
  youtube: { summary: '…', tags: [/* 6–10 */], title: '…' },
};
```

Metadata is grouped by concern: `production` is how the video gets made,
`release` is where it sits in the season, `youtube` is what an upload needs.

## A beat carries the picture; a variant carries the words

This is the load-bearing decision, and it is what makes A/B testing possible at
all.

Every variant of an episode shares one `beats` list, so **one recording serves
every take**. You re-narrate; you do not re-record. Were `action` to sit inside
a variant, two variants could disagree about what is on screen and the pipeline
would have no way to know which take a set of frames belonged to.

The evidence for the split is that it was already true in practice: when episode
05 shipped as five separate markdown files, all five had a byte-identical action
column and identical beat times, and differed only in narration.

## A variant owns its timings

`narration` is an ordered list of `NarrationCue` tuples — `['0:09', 'the words']`
— and **not** a map keyed off the beats.

Nothing says a slower read speaks at a faster one's moments. A payoff-first take
may hold its opening two seconds longer than a problem-first one; keying the
words to the picture would force every take to breathe identically, which defeats
the point of testing a slower delivery. A cue does not have to start with a beat,
and a beat does not have to carry a cue.

Silence is normal. Most shorts land 25–35 seconds of speech across 55 seconds of
picture, and the gaps are where the viewer watches instead of being talked at.

### How cues reach the picture

`assemble/timeline.ts` resolves each cue to the beat that had started by the
cue's time, via `beatIndexForCue`, against the episode's beat times. The runner's
`manifest.json` remains the authority on when a beat _actually_ happened — script
and cue times are intent, captured spans are fact. Where a beat's narration
outruns its on-screen action, the dwell on its last frame is extended rather than
the picture being sped up.

A beat with no cue is silent, and a cue landing before the first beat is an error
that gets named. Captions resolve the same way, so a caption cannot drift against
the audio it transcribes.

## Layout

```text
src/episodes/
├── registry.ts              # explicit imports; the only thing that knows what exists
├── types.ts  derived.ts  description.ts
└── <id>/
    ├── episode.ts           # the script
    ├── flow.ts              # the on-screen actions, as executable steps
    ├── surface.ts           # typeset surfaces used by this episode only
    └── __tests__/
```

**The registry imports each episode by name.** No filesystem globbing: a glob is
not typecheckable, resolves at runtime rather than at build, and turns "that
episode does not exist" into a surprise at record time. It costs one line per
episode.

**The episode and its flow sit together** because they are transcriptions of each
other — the flow's steps are the beats' action column, and both sides must agree
on the same beat labels for the manifest to mean anything. Co-located, a drift
between them is one directory in a diff. `runner/run.ts` resolves a flow as
`../episodes/<id>/flow.ts`.

Episode-specific surfaces sit beside them; shared surface builders such as
`shell.ts` stay in `src/surfaces/`. Not every episode has a flow yet — only the
ones that have been recorded.

## Output: the capture is shared, the take is not

```text
output/<episode>/                 # frames, frames.concat, manifest.json, portrait/, text/
output/<episode>/render-cache/    # keyed on backend + model + voice + text
output/<episode>/<variant>/       # audio, timings.json, masters, .srt, metadata.json
```

Only what derives from the **words** is per-variant. Namespacing the capture too
would mean recording once per variant, which destroys the economics the variant
array exists for. `video-record` therefore takes no `--variant` at all.

The **render cache is deliberately not namespaced**: two takes that share a
sentence share the rendered audio, which is a real saving against hosted TTS
since variants differ at the open and close far more than in the middle.

`timings.json` and `metadata.json` both record the variant alongside the backend,
voice and model — an unlabelled take of a four-variant episode is an unidentified
take.

## Variant ids name a thesis

`payoff-first`, not `v3`. An ordinal records the day a variant was written, which
is the one fact nobody needs.

`thesis` is optional for a lone variant — "why this one rather than the others"
is not a question a single take can answer — and **required once an episode has
more than one**, enforced by the validator. It carries the prose rationale for
why that take exists.

## Computed, never stored

`spokenWords`, estimated spoken seconds (145 wpm) and budget headroom against
`format.json` are functions over a variant, not fields on it. Nothing derived can
go stale, and there is no `--check` mode whose only job is to notice that a file
and its own derived field have diverged.

`youtube.summary` is optional; when absent the description composer opens with
the title, which is what shipped before summaries existed.

## Validation

`video-validate` runs the rules in
[`src/validate/rules.ts`](../../packages/openthrottle-showroom/src/validate/rules.ts)
over every episode and **every variant** — a variant nobody can use is worth
catching while it is being written.

Findings have two severities:

- **error** — structurally wrong for any episode: over budget, beats or cues out
  of order, a duplicate release slot, a `selectedVariant` naming nothing, a short
  carrying chapters or a designed thumbnail.
- **publish** — a documented YouTube convention. Advisory while an episode is a
  `draft`; an error once it is `ready` or `published`.

That split is deliberate. Enforcing the conventions strictly today would fail
every episode in the season, and a gate that is red on arrival gets switched off.
Instead the conventions bind at exactly the moment they matter: an episode cannot
be marked `ready` until it satisfies them.

## What the format does not change

- The narration text is the **literal TTS input**. Not a summary, not a caption.
- A beat's action is the **literal flow step**.
- `t` is the beat start, `mm:ss`, monotonic, first beat at zero (`0:00` and
  `00:00` are both accepted).
- The craft in [`writing.md`](./writing.md) — write for the ear, never read a URL
  aloud, front-load the payoff.
