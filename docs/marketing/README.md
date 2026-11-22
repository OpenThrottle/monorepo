# Marketing · @OpenThrottleAI

The channel and the production pipeline behind it. The premise: OpenThrottle is a
visual product with a fast story, so short screencasts of the real app are the
right medium — but there is **no presenter and no editor**, so every video has to
be produced by something you can run.

## Read in this order

1. **[youtube-format.md](./youtube-format.md)** — the format spec: what the format
   is and why. Beat structure, cards, titles/descriptions/tags, channel identity.
   It names `format.json` keys and never restates their values. Start here;
   everything else assumes it.
2. **[format.json](./format.json)** — the numbers. The pipeline reads this file; it
   never hard-codes a resolution or a LUFS target.
3. **[pipeline.md](./pipeline.md)** — how a script becomes an mp4: seed → record →
   narrate → assemble, and the Nx targets that drive each stage.
4. **[writing.md](./writing.md)** — how to write an episode, including variants.
   The episodes themselves are typed modules under
   [`packages/openthrottle-showroom/src/episodes/`](../../packages/openthrottle-showroom/src/episodes/);
   the narration is the literal TTS input.
   [episode-format.md](./episode-format.md) explains the shape and why.
5. **[publish-checklist.md](./publish-checklist.md)** — the gate every video
   clears before upload. Non-negotiable: recording the real app is a live leak
   risk and automation makes that worse, not better.
6. **[publishing.md](./publishing.md)** — release order, cadence, playlists,
   metadata, the upload-automation decision (deliberately deferred), and what "done"
   means for Season 1.

## Who owns what

One owner per fact, so the next edit does not re-duplicate it. **No `.md` file in
this folder states a numeric format value; it names the key that owns it.**

| Fact                                                                                                 | Owner                                                                        |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Durations, resolutions, frame rate, loudness and true peak, sample rate, bitrates, safe areas, cards | [`format.json`](./format.json)                                               |
| Why the format is what it is: beats, cards, titles, descriptions, channel identity                   | [`youtube-format.md`](./youtube-format.md)                                   |
| The typed episode shape and why: beats vs variants, layout, output, validation                       | [`episode-format.md`](./episode-format.md)                                   |
| How to write an episode: craft rules, variants, workflow                                             | [`writing.md`](./writing.md)                                                 |
| How a script becomes an mp4, and the Nx targets                                                      | [`pipeline.md`](./pipeline.md)                                               |
| Release order, cadence, what "done" means                                                            | [`publishing.md`](./publishing.md)                                           |
| The pre-upload gate                                                                                  | [`publish-checklist.md`](./publish-checklist.md)                             |
| Validator thresholds (tag count, thumbnail words)                                                    | [`rules.ts`](../../packages/openthrottle-showroom/src/validate/rules.ts)     |
| Reading rate and the spoken-word budget                                                              | [`derived.ts`](../../packages/openthrottle-showroom/src/episodes/derived.ts) |
| Artwork dimensions                                                                                   | [`assets/README.md`](./assets/README.md)                                     |

The `episode-format.md` / `writing.md` split is by reader intent: **episode-format
explains the shape** (what the types are and why they are that shape), **writing
explains the craft** (how to fill the shape well). A rule about a number goes to the
owner above, and the other files link to it. Narration, voice and loudness mechanics
live in the showroom package's `NARRATION.md`.

Prose explaining _why_ a value is what it is may stay in these files, without
restating the number. Examples and copy (a sample timestamp, a quoted title, an
episode id) are not format values.

## Assets

[`assets/`](./assets/) — SVG cards and channel art, rasterised at build time. See
[`assets/README.md`](./assets/README.md).

## Related

- [../openthrottle/styles.md](../openthrottle/styles.md) — the app's theme tokens and
  palette, which the cards inherit rather than reinvent.
- [../../packages/openthrottle-showroom/PIPELINE.md](../../packages/openthrottle-showroom/PIPELINE.md)
  — the pipeline itself: the demo database, seeding, recording a flow, and the
  typeset surfaces used for beats that are not the app.
- [../../applications/openthrottle-developer/tests/e2e/README.md](../../applications/openthrottle-developer/tests/e2e/README.md)
  — the Maestro E2E harness. The demo flows share its seeded user pattern and its
  selectors; the app must not grow two parallel sets of test hooks, and a test in
  the showroom package fails if a flow targets a hook the app no longer renders.
