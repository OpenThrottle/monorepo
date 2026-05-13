# openthrottle-developer · Maestro E2E

Decoupled Maestro harness for the `openthrottle-developer` React Router app. All
Maestro assets live under this directory so the application source under
`applications/openthrottle-developer/app/` stays free of test infrastructure.

> Detailed prerequisites and run steps land in a follow-up task. This README is
> the layout reference; treat it as the source of truth for **where** Maestro
> files belong.

## Layout

```text
applications/openthrottle-developer/tests/e2e/
├── config.yaml      # Maestro workspace config (flows glob, tags, local opts)
├── flows/           # Maestro flow YAML files (one flow per file, kebab-case)
├── helpers/         # Reusable subflows referenced via `runFlow`
└── output/          # Run artifacts (gitignored; screenshots, recordings, reports)
```

## Conventions

- **One flow per file.** Name flows `kebab-case.yaml` and place them under
  `flows/` (or a feature subdirectory like `flows/plans/`).
- **`appId` per flow.** Each YAML must declare its `appId` (mobile bundle id) or
  set `url` for browser/WebView flows. Keep selectors generic until stable
  testIDs / accessibility labels are in place.
- **Shared steps go in `helpers/`** and are pulled in via `runFlow:` so flows
  stay readable.
- **Artifacts stay in `output/`** which is gitignored. Never commit recordings.
- **Do not place Maestro files under `app/`.** Application source must remain
  free of test infrastructure (PR review gate).

## Running locally (placeholder)

The Nx target wiring lands in a follow-up task. Once available the canonical
entry point will be:

```bash
pnpm nx run openthrottle-developer:test-e2e
```

Until then flows can be exercised manually from this directory:

```bash
cd applications/openthrottle-developer/tests/e2e
maestro test flows/<your-flow>.yaml
```

See the OpenThrottle stack skill (`.agents/skills/openthrottle-stack/SKILL.md`)
and the developer app env defaults (`../../.env.default`) for ports and URLs
when pointing flows at a local server.
