# @openthrottle/openthrottle-showroom

The screencast pipeline behind [@OpenThrottleAI](https://youtube.com/@OpenThrottleAI) — the "0–60" channel. It turns a typed episode script into an upload-ready video: drive the real app with Playwright, render narration, assemble masters and captions, and leak-scan the result before anything is published.

Format spec, writing rules and the publish checklist live in [`docs/marketing/`](../../docs/marketing/README.md).

## Not published, and not installable

`private: true`, tagged `publish:false`. This package exists for this monorepo and has exactly one consumer: OpenThrottle itself. There is no `pnpm add` for it, and its API is not designed for anyone outside this repo.

## Source-first

No `build` target. `main`/`types` point at `./src/index.ts` and consumers transpile the source — see [MONOREPO.md](../../MONOREPO.md) § "Projects without a `build` target". Validate with `lint`, `typecheck` and `test`.

## Layout

```text
src/
├── episodes/    # typed episode scripts — beats, variants, YouTube metadata
├── flows/       # demo flows: the on-screen-action column, as executable steps
├── surfaces/    # typeset shell/HTML surfaces for beats that are not the app
├── fixtures/    # the hand-authored hero rows of the demo workspace
├── snapshot/    # sanitized snapshot of the real workspace: export, load, verify
├── runner/      # Playwright capture → frames + step-timing manifest
├── narrate/     # TTS backends → per-sentence audio + timings
├── assemble/    # ffmpeg masters, captions, cards, upload metadata
└── scan/        # pre-publish leak scan
```

## Workflow

The episode and its audio are produced independently and can be recreated as needed and assembled. First we take a snapshot of real-world data and sanitize it best we can. Then we automate a browser interacting with the actual product and here is how to do it.

- [Episodes](packages/openthrottle-showroom/src/episodes)

### Setup

```bash
# 🌱 create snapshots for our seeds
pnpm nx run @openthrottle/openthrottle-showroom:snapshot-refresh

# 🌳 Seed the demo database
POSTGRES_HOST=localhost sh packages/openthrottle-showroom/src/scripts/seed-demo.sh --reset

# 😂 Trust but verify - are we ready
POSTGRES_HOST=localhost pnpm nx run @openthrottle/openthrottle-showroom:video-seed-verify

OPENTHROTTLE_POSTGRES_URL='postgresql://openthrottle_user:openthrottle_password@localhost:6010/openthrottle_demo' pnpm nx run openthrottle-server:dev
```

### Recording

```bash
# 0. Set the episode
EPISODE=21-dashboard-tour

# 1. Run the application in a E2E manner
pnpm exec tsx packages/openthrottle-showroom/src/runner/run.ts --flow $EPISODE --headed

# 2. Using the script we narrate the episode
pnpm exec tsx packages/openthrottle-showroom/src/narrate/narrate.ts --script $EPISODE

# 3. Stich it all together
pnpm exec tsx packages/openthrottle-showroom/src/assemble/assemble.ts --script $EPISODE
```

Additional flags:

```bash
# --base http://localhost:6020
# --backend elevenlabs | fish-audio
# --flow 08-promote-task
# --headed

pnpm exec tsx packages/openthrottle-showroom/src/runner/run.ts \
  --backend fish-audio \
  --base http://localhost:6020 \
  --flow 08-promote-task \
  --headed
```

## Demo Database + User

- email: `ada@atlasworks.example`
- githubUsername: `atlas-ada`
- password: `DemoThrottle2026!`

## Episodes

- [ ] 🚧 `01-what-is-openthrottle`
- [ ] 🚧 `02-one-command-boot`
- [ ] 🚧 `03-first-plan`
- [ ] 🚧 `04-mental-model`
- [ ] 🚧 `05-connect-ot-mcp`
- [ ] `06-prd-to-plan`
- [ ] `07-semantic-search`
- [ ] 🚧 `08-promote-task`
- [ ] 🚧 `09-tags-and-rules`
- [ ] `10-notes`
- [ ] `11-ralph-one-task`
- [ ] `12-watch-run-live`
- [ ] `13-plan-id-traceability`
- [ ] `14-scheduled-runs`
- [ ] `15-kill-runaway-run`
- [ ] `16-worktrees`
- [ ] `17-chat-any-cli`
- [ ] `18-ollama-local-models`
- [ ] `19-skills`
- [ ] `20-generators`
- [ ] 🚧 `21-dashboard-tour`
- [ ] `22-self-host-docker-compose`
- [ ] `L1-idea-to-shipped-commit`
- [ ] `L2-setup-from-scratch`
