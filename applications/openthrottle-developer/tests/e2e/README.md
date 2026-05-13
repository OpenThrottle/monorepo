# openthrottle-developer · Maestro E2E

Decoupled Maestro harness for the `openthrottle-developer` React Router app. All
Maestro assets live under this directory so the application source under
`applications/openthrottle-developer/app/` stays free of test infrastructure.

Treat this README as the source of truth for **where** Maestro files belong; a
longer runbook may extend it under the same directory.

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

## Running locally

**Prerequisites:** [Maestro CLI](https://docs.maestro.dev/getting-started/installing-maestro) on your PATH, dev server reachable at the URL in the flow (default `http://localhost:6020`; see `../../.env.default` and `PORT`).

**Canonical entry (all flows under `flows/`):**

```bash
pnpm nx run openthrottle-developer:test-e2e
```

Nx runs Maestro with `cwd` set to this directory. The command discovers every `*.yaml` under `flows/` (including nested folders) and passes them to `maestro test --config config.yaml`. This target expects POSIX `find` and `xargs` (macOS and Linux; on Windows use WSL or run Maestro manually from this directory).

**Manual run (single flow):**

```bash
cd applications/openthrottle-developer/tests/e2e
maestro test flows/<your-flow>.yaml --config config.yaml
```

**Nx configurations:** `record` (`maestro record --local`), `studio` (`maestro studio`), and `watch` (continuous test) use the same `cwd`; invoke with `pnpm nx run openthrottle-developer:test-e2e --configuration=studio`, etc.

For stack context (GraphQL, env verification), see `.agents/skills/openthrottle-stack/SKILL.md`.
