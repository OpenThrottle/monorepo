# The typed episode format

Design note for the move from markdown scripts to typed TypeScript episodes.
The types live in
[`packages/openthrottle-showroom/src/episodes/types.ts`](../../packages/openthrottle-showroom/src/episodes/types.ts);
this file records the decisions and why they went the way they did.

## What it replaces

`docs/marketing/scripts/<id>.md` — YAML front matter plus a markdown beats table
— read by three independent regex parsers:

| Reader                              | What it took                   | Problem                                                     |
| ----------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| `scripts/validate-video-scripts.ts` | front matter, narration column | **Rewrote `spokenWords` back into the file** it just read   |
| `narrate/parse-script.ts`           | narration column               | Its own front-matter regex, its own error paths             |
| `assemble/assemble.ts`              | title, titleCard, tags         | Scraped tags with `/^ {2}- (.+)$/gm` — any two-space bullet |

Three parsers, three notions of what a script is, and no compiler.

## The one finding that shaped the design

All five of episode 05's files — `05-connect-ot-mcp.md` and `-v0` through `-v3`
— have a **byte-identical action column and identical beat times**. Verified by
hashing the `t` + action pairs out of each; all five hash the same. They differ
only in narration.

So a beat carries the **picture**, and a variant carries the **words**:

```ts
beats:    [{ t: '0:00', action: 'Terminal. Run `pnpm run setup:mcp-instructions`…' }, …]
variants: [{ id: 'payoff-first', thesis: '…', narration: [['0:00', 'In sixty seconds…'], …] }, …]
```

This is not a tidier arrangement of the same information — it changes what is
guaranteed. One recording serves every variant, which is the entire economic case
for A/B testing a video: you re-narrate, you do not re-record. Had `beats` sat on
the variant with `action` inside it, nothing would stop two variants from
disagreeing about what is on screen, and the pipeline would have no way to know
which take the frames belonged to.

## Decisions

### A variant owns its own timings

`narration: readonly NarrationCue[]`, where a cue is a `['0:09', 'the words']`
tuple.

The first cut of this design keyed narration off the beat labels —
`Record<string, string>` — on the theory that the shared picture should anchor
the words. That was wrong, and wrong in a way that would have quietly constrained
the thing the format exists to enable: **nothing says variant 2 speaks at variant
1's timings.** A slower, payoff-first read may hold its opening two seconds longer
than a problem-first one. Keying the words to the picture's beats forces every
take to breathe identically, which defeats the point of testing a slower delivery
at all.

So the narration track is its own ordered list of timed cues. A cue does not have
to start with a beat, and a beat does not have to carry a cue. Silence stays
normal — most shorts land 25–35 seconds of speech across 55 seconds of picture,
and the gaps are where the viewer watches instead of being talked at.

**Consequence for the assembler, and it is not free.** `assemble/timeline.ts`
currently matches narration to flow beats **positionally** — the 05 flow carries
a comment warning that an extra flow beat "does not merely go unnarrated — it
shifts every later beat's narration one beat early". Independent cue times mean
that matching has to become time-based rather than positional. The runner's
manifest remains the authority on when a beat actually happened (script times are
intent, not gospel), so the reconciliation is cue time → beat span, and the
rewiring task owns it. Getting this right _removes_ the positional hazard rather
than repeating it.

### One module per episode, explicit registry

`src/episodes/<id>/episode.ts`, with `src/episodes/index.ts` importing each one
by name.

No filesystem globbing. A glob registry is not typecheckable, fails at runtime
rather than at build, and hides a missing episode until something asks for it.
The index is three lines longer per episode and worth it.

### The episode and its flow sit together

`src/episodes/<id>/{episode.ts, flow.ts}` — not parallel `episodes/` and
`flows/` trees.

They are transcriptions of each other: the flow's steps are the beats' action
column, and both sides have to agree on the same beat labels for the manifest to
mean anything. Co-located, a drift between them is one directory in a diff. Split
across two trees, it is two files a reviewer has to think to open together.

Episode-**specific** surfaces move in beside them too (`connect-ot-mcp.ts` is
used by exactly one episode). Shared surface builders — `shell.ts` — stay in
`src/surfaces/`.

Cost: `runner/run.ts` resolves flows with a dynamic import template,
`../flows/${flowId}.flow.ts`. That becomes `../episodes/${id}/flow.ts`. One line.

### The markdown scripts disappear; nothing regenerates them

No generated markdown mirror.

A generated view is another surface to keep honest, and this plan exists partly
because a derived value stored as source (`spokenWords`) rotted. A TypeScript
module with prose in doc comments reads fine in a GitHub diff. Where a
human-readable overview genuinely helps — word counts, spoken seconds, budget
headroom, variant comparison — the validator prints it on demand, computed fresh,
rather than committing a copy that can go stale.

### Variant ids name a thesis

`payoff-first`, not `v3`.

Four variants existed because someone was testing four different openings. The
ordinal recorded the order they were written in, which is the one fact nobody
needs. The `thesis` field carries the prose rationale that currently sits under
each file's front matter — that text is the record of _why_ four exist and must
not be dropped in migration.

### Variant ids namespace the takes

`output/<slug>/<variant>/` for audio, frames, manifests, masters, `.srt` and
`metadata.json`, and the variant id is recorded in `timings.json` and
`metadata.json` alongside the backend, voice and model.

Those provenance fields exist so a take traces to what produced it. The words are
as much a part of that as the voice is — an unlabelled take of a four-variant
episode is an unidentified take.

The **render cache** is deliberately _not_ namespaced. It keys on backend, model,
voice and spoken text, so two variants sharing a sentence share the render. That
is correct and a real saving against hosted TTS: variants differ in their opening
and closing lines far more than in the middle.

## What stays exactly as it was

- The narration text is the **literal TTS input**. Not a summary, not a caption.
- A beat's action is the **literal flow step**.
- `t` is the beat start, `mm:ss`, monotonic, first beat at `0:00`.
- The writing rules in
  [`scripts/README.md`](./scripts/README.md) — write for the ear, never read a
  URL aloud, front-load the payoff. The format changed; the craft did not.

## What is computed, never stored

`spokenWords`, estimated spoken seconds (145 wpm), and budget headroom against
`format.json`. These were fields; they are functions now. That is what removes
the validator's file-rewriting step, and with it the `--check` mode that existed
only to detect that the file and its own derived field had diverged.
