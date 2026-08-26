# @openthrottle/openthrottle-showroom

The screencast pipeline behind [@OpenThrottleAI](https://youtube.com/@OpenThrottleAI) —
the "0–60" channel. It turns a typed episode script into an upload-ready video:
drive the real app with Playwright, render narration, assemble masters and
captions, and leak-scan the result before anything is published.

Format spec, writing rules and the publish checklist live in
[`docs/marketing/`](../../docs/marketing/README.md).

## Not published, and not installable

`private: true`, tagged `publish:false`. This package exists for this monorepo and
has exactly one consumer: OpenThrottle itself. There is no `pnpm add` for it, and
its API is not designed for anyone outside this repo.

## Source-first

No `build` target. `main`/`types` point at `./src/index.ts` and consumers
transpile the source — see [MONOREPO.md](../../MONOREPO.md) § "Projects without a
`build` target". Validate with `lint`, `typecheck` and `test`.

## Layout

```text
src/
├── episodes/    # typed episode scripts — beats, variants, YouTube metadata
├── flows/       # demo flows: the on-screen-action column, as executable steps
├── surfaces/    # typeset shell/HTML surfaces for beats that are not the app
├── fixtures/    # the fictional demo workspace
├── runner/      # Playwright capture → frames + step-timing manifest
├── narrate/     # TTS backends → per-sentence audio + timings
├── assemble/    # ffmpeg masters, captions, cards, upload metadata
└── scan/        # pre-publish leak scan
```
