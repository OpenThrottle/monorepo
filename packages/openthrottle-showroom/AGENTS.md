# @openthrottle/openthrottle-showroom — agent notes

The screencast pipeline for the @OpenThrottleAI "0–60" channel: typed episode
scripts, demo flows, Playwright capture, narration, ffmpeg assembly and a
pre-publish leak scan. Consumed only by this monorepo — never published.

## Layout

- [src/index.ts](src/index.ts) — public entry point. Export the package's public
  API here and tag exported public API with `@public` so Knip keeps it.
- `src/episodes/` — one typed module per video. The **narration field is the
  literal TTS input** and the **action field is the literal flow step**; the flow
  transcribes the script rather than interpreting it. `registry.ts` knows what
  episodes exist and `flows.ts` knows which of them can be recorded; both use
  explicit imports, because a glob is not typecheckable.
- `src/episodes/_template/flow.ts` — the skeleton a new flow is copied from. Not
  registered, so nothing records it.
- `src/flows/`, `src/surfaces/`, `src/fixtures/` — what goes on camera.
- `src/runner/`, `src/narrate/`, `src/assemble/`, `src/scan/` — the four stages.

## Invariants & gotchas

- **Source-first.** No `build` target, by design — `main`/`types` are
  `./src/index.ts`. Do not add one.
- **Private and repo-scoped.** `private: true`, `publish:false`,
  `production:false`. Do not design its API for consumers outside this repo.
- **A flow declares one beat fewer than its episode**, because the outro card is
  appended by the assembler rather than recorded. Narration cues find their beat
  by their own time (`beatIndexForCue`), not by position — that replaced
  positional matching precisely so a stray beat could not shift the track. What
  a wrong beat COUNT still breaks is `planTimeline`, which resolves each beat's
  narration budget by index, so every beat past the divergence is held for the
  wrong duration. `episodes/__tests__/flows.test.ts` fails on it.
- **Selectors are shared with the app's E2E suite.** A demo video is structurally
  an E2E flow; both must drive the same test hooks so the app never grows two
  parallel sets.
- **The demo database is separate on purpose.** Recording against the dev
  database captured real internal work; the fictional fixture is the primary
  leak-prevention control for the whole pipeline, not a convenience.

## Pointers

- [AUTHORING_FLOWS.md](AUTHORING_FLOWS.md) — the conventions a new flow must
  follow, each one citing the flow that taught it.
- [RECORDABILITY.md](RECORDABILITY.md) — per-beat verdicts for every episode
  without a flow. Read your episode's row before authoring anything.
- [README.md](README.md) — human-facing overview.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout,
  `@public` tags, source-first pattern).
- [docs/marketing/](../../docs/marketing/README.md) — format spec, scripts,
  pipeline and publish checklist.
