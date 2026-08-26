# Marketing · @OpenThrottleAI

The channel and the production pipeline behind it. The premise: OpenThrottle is a
visual product with a fast story, so short screencasts of the real app are the
right medium — but there is **no presenter and no editor**, so every video has to
be produced by something you can run.

## Read in this order

1. **[youtube-format.md](./youtube-format.md)** — the format spec. Durations,
   aspect ratios, beat structure, safe areas, cards, titles/descriptions/tags,
   channel identity. Start here; everything else assumes it.
2. **[format.json](./format.json)** — the same spec, machine-readable. The
   pipeline reads this file; it never hard-codes a resolution or a LUFS target.
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
7. **[catalogue-rebuild.md](./catalogue-rebuild.md)** — the scheduled re-record that
   catches UI drift, and the four things that must be true before enabling it.

## Assets

[`assets/`](./assets/) — SVG cards and channel art, rasterised at build time. See
[`assets/README.md`](./assets/README.md).

## Related

- [../openthrottle/brand-palette.md](../openthrottle/brand-palette.md) — the app's
  palette, which the cards inherit rather than reinvent.
- [../../packages/openthrottle-showroom/PIPELINE.md](../../packages/openthrottle-showroom/PIPELINE.md)
  — the pipeline itself: the demo database, seeding, recording a flow, and the
  typeset surfaces used for beats that are not the app.
- [../../applications/openthrottle-developer/tests/e2e/README.md](../../applications/openthrottle-developer/tests/e2e/README.md)
  — the Maestro E2E harness. The demo flows share its seeded user pattern and its
  selectors; the app must not grow two parallel sets of test hooks, and a test in
  the showroom package fails if a flow targets a hook the app no longer renders.
