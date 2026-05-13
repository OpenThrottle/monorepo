# openthrottle-developer · Maestro E2E

Decoupled Maestro harness for the `openthrottle-developer` React Router app. All
Maestro assets live under this directory so the application source under
`applications/openthrottle-developer/app/` stays free of test infrastructure.

Treat this README as the source of truth for **where** Maestro files belong and
**how** to run the harness locally.

## Runbook

### Prerequisites

- **Node and pnpm** — Same as the rest of the monorepo (see the root `README.md`
  if you are new here).
- **Maestro CLI** — Install and verify it is on your `PATH` so `maestro --version`
  works. Follow the official guide: [How to install Maestro
  CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli.md).
- **Running app for web flows** — The default `flows/smoke.yaml` flow uses Maestro
  **Web** (Beta): it opens a browser against a `url` field. The app must already
  be reachable at that URL (typically a local dev server).
- **Running app for native flows** — Flows that declare `appId` instead of `url`
  need a matching build installed on an **Android emulator**, **iOS Simulator**,
  or a **physical device** that Maestro can see. Start an emulator or connect a
  device before running Maestro; see the [Maestro
  QuickStart](https://docs.maestro.dev/getting-started/installing-maestro) tabs
  for Android and iOS setup.

### Start the app (local dev)

In a separate terminal from Maestro:

```bash
pnpm nx serve openthrottle-developer
```

Default port is **6020** (see `applications/openthrottle-developer/.env.default`
for `PORT` and `APP_URL`). Wait until the dev server is listening before starting
Maestro, or web flows will fail with connection errors.

For a production-like bundle you can build and serve however your team normally
does for manual QA; point the flow `url` at that host and port.

### Run all flows (Nx)

From the repository root:

```bash
pnpm nx run openthrottle-developer:test-e2e
```

Nx sets `cwd` to this directory and runs every `*.yaml` under `flows/` through
`maestro test --config config.yaml`. That shell pipeline uses POSIX `find` and
`xargs` (macOS and Linux). On Windows, use WSL or run Maestro manually from this
directory.

Other configurations (same `cwd`):

- **record** — `pnpm nx run openthrottle-developer:test-e2e --configuration=record`
  (runs `maestro record --local`).
- **studio** — `pnpm nx run openthrottle-developer:test-e2e --configuration=studio`
  (runs `maestro studio`).
- **watch** — `pnpm nx run openthrottle-developer:test-e2e --configuration=watch`
  (continuous test mode, Maestro `-c`).

### Run a single flow (manual)

```bash
cd applications/openthrottle-developer/tests/e2e
maestro test flows/smoke.yaml --config config.yaml
```

### Point at staging, preview, or another base URL

Today `flows/smoke.yaml` hard-codes `http://localhost:6020`. To hit another
environment:

- **Quick:** Change the `url:` line at the top of that file (do not commit
  environment-specific URLs unless the team agrees), or
- **Cleaner:** Add another flow under `flows/` (for example
  `flows/smoke-staging.yaml`) with the desired `url`, or
- **Parameterized:** Maestro supports [parameters and environment
  injection](https://docs.maestro.dev/maestro-flows/flow-control-and-logic/parameters-and-constants)
  (`maestro test -e ...` and `${VAR}` in YAML). Prefer that for CI or shared
  secrets; if `${url}` behaves oddly on older CLI versions with Web flows,
  upgrade Maestro or keep a per-environment YAML until resolved.

### Troubleshooting

- **`maestro: command not found`** — CLI not installed or not on `PATH`.
- **Connection refused / timeout on `launchApp`** (web) — Dev server not running,
  wrong port, or wrong `url` in the flow.
- **No device / “Want to use 0 devices”** (native) — No emulator running or device
  not trusted; for web flows, confirm the flow uses `url` (web) not only `appId`.

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

## See also

For stack context (GraphQL, env verification, server plus developer app), see
`.agents/skills/openthrottle-stack/SKILL.md`.
