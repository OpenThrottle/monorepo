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
pnpm nx run openthrottle-developer:dev
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

- **smoke** — `pnpm nx run openthrottle-developer:test-e2e --configuration=smoke`
  (`--include-tags smoke`; the fast unauthenticated PR gate — one flow).
- **full** — `pnpm nx run openthrottle-developer:test-e2e --configuration=full`
  (`--include-tags full`; the complete authenticated suite).
- **record** — `pnpm nx run openthrottle-developer:test-e2e --configuration=record`
  (runs `maestro record --local`).
- **studio** — `pnpm nx run openthrottle-developer:test-e2e --configuration=studio`
  (runs `maestro studio`).
- **watch** — `pnpm nx run openthrottle-developer:test-e2e --configuration=watch`
  (continuous test mode, Maestro `-c`).

### Tagging scheme

Every flow declares `tags:`; scope a run with `--include-tags <tag>`:

| Tag                           | What runs                                           |
| ----------------------------- | --------------------------------------------------- |
| `smoke`                       | Fast, unauthenticated PR gate (`flows/smoke.yaml`). |
| `full`                        | The complete suite — **every** flow carries `full`. |
| `auth` / `plans` / `projects` | Per-area subsets for targeted local runs.           |

`wip` is excluded by default (`config.yaml` `excludeTags`) — tag a flow `wip` to
park it without deleting it.

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

## Authenticated E2E setup & test data

The `smoke.yaml` flow is unauthenticated. The useful flows (plans, projects, …)
live behind the login wall, so they need a running backend, a known test user,
and a predictable data strategy. This section is the source of truth for that
setup.

### The auth wall is always on

`FEATURE_BETA_PREVIEW` (in `packages/react-router-utils/src/config/features.ts`)
is hard-coded `true` — there is **no env var to toggle it**. The root loader
(`app/root.tsx`) redirects unauthenticated requests for any
`PROTECTED_PATH_PREFIXES` entry (`/dashboard`, `/plans`, `/projects`,
`/generators`, `/notes`, `/pull-requests`, `/queues`, `/search`, `/settings`) to
`/auth`. So protected-route guarding is the default — no special configuration
is required to exercise it.

### Bring up the stack (repeatable)

**Run E2E against a production build of the developer app**, not the dev server —
dev mode (Vite/HMR, `NODE_ENV=development`) is not representative. This is how CI
runs the suite. Dev mode is fine for _authoring/iterating_ on flows locally.

```bash
pnpm run database:start                       # Postgres (:6010) + Redis (:6011)
pnpm run database:migrate                      # ensure the users table exists
pnpm nx run openthrottle-server:dev            # GraphQL API at http://localhost:6021

# Developer app — PRODUCTION build + serve on :6020:
pnpm nx run openthrottle-developer:build
( cd applications/openthrottle-developer \
  && set -a && . ./.env.default && set +a \
  && PORT=6020 NODE_ENV=production npx react-router-serve ./build/server/index.js )
```

> `react-router-serve` does not auto-load env, so source `.env.default` (it sets
> `APP_ENV`, `APP_NAME`, etc.) before serving or the routes 500 with
> "APP_ENV is not set".

For quick local authoring you can instead run `pnpm nx run openthrottle-developer:dev`,
but verify the suite against the production build before relying on it.

Wait until both the server (`:6021`) and the app (`:6020`) are listening before
running Maestro. Auth is JWT-in-an-HTTP-only-cookie: the `/auth` action calls the
server `login` mutation and stores the returned token in a cookie; the root
loader reads it on every request.

### Seed the deterministic test user

Authenticated flows log in as a single known user. Create it idempotently with:

```bash
sh tests/e2e/scripts/seed-user.sh
```

The script calls the server `register` GraphQL mutation (which bcrypt-hashes the
password). Re-running is safe — once the user exists the server returns
"Email already registered", which the script treats as success.

Defaults (override via env). They **match the credentials the `/auth` form
pre-fills**, because the login helper submits the prefilled form rather than
typing (see the Maestro Web notes below):

| Env var             | Default                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `E2E_USER_EMAIL`    | `developer@openthrottle.ai`                                       |
| `E2E_USER_PASSWORD` | `FullThrottle2026!`                                               |
| `E2E_GRAPHQL_URL`   | `http://localhost:6021/graphql` (`API_URL_INTERNAL` + `/graphql`) |

These are the app's own **local** dev credentials, not secrets. In CI or shared
environments, pass real values through the same env vars — and update the form
prefill / helper accordingly — rather than committing new secrets.

### Maestro Web selector & input notes

Maestro Web is Beta; a few behaviors learned the hard way that all flows should
follow:

- **`id:` matches the DOM `id` attribute first.** If an element has a real `id`,
  Maestro's `id:` selector matches that, not its `data-testid`. The `/auth`
  inputs have ids (`auth-email`, `auth-password`); the submit button is given
  `id="auth-submit-button"`. Elements with only a `data-testid` (e.g. the
  `OpenThrottleAuthForm` card, `dashboard-content-grid`) match by that value.
  Added `data-testid`s are still useful for component (RTL) tests.
- **Controlled React inputs can't be reliably cleared.** `eraseText` does not
  round-trip through React state, so a prefilled controlled input keeps its
  value and typed text gets prepended (producing invalid input). The login
  helper therefore **submits the prefilled form** instead of typing — hence the
  seeded user must match the form prefill (above).
- **Don't interpolate `${VAR}` in the `url:` header.** It is unreliable on
  Maestro Web — the page silently fails to load. Hard-code the host (flows use
  the default dev port `6020`) and override per the "another base URL" section.
- **Animated pages need a settle wait.** `/auth` runs a continuous WebGL gradient,
  so wait for the target element (`extendedWaitUntil: visible:`) before tapping
  rather than asserting immediately.

### The login helper

`helpers/login.yaml` is the reusable building block: it opens `/auth`, waits for
the form, taps submit (logging in as the prefilled seeded user), and waits for
`dashboard-content-grid` to confirm an authenticated landing. Reuse it from any
authenticated spec:

```yaml
- runFlow:
    file: ../../helpers/login.yaml # path is relative to the calling flow
```

### Test-data strategy (avoid cross-run pollution)

- **Create flows (plans, tasks):** use a **unique-per-run title**, e.g. suffix
  with a Maestro `${timestamp}`/run marker (`E2E plan ${RUN_ID}`). Assert against
  that unique title rather than global counts or "the first row". This keeps runs
  independent without a teardown step — leftover rows from prior runs are inert.
- **Projects:** these are **read-only**, discovered from the Nx workspace, so they
  are inherently stable. Assert against a known project that always exists
  (e.g. `openthrottle-developer`) instead of transient data.
- **No destructive teardown** is required for the first-wave flows. If a flow ever
  needs a clean slate, prefer creating uniquely-scoped data over deleting shared
  rows.

## Running in CI

`scripts/run-ci.sh` is a one-command runner: it builds the app, serves it in
production mode, seeds the test user, waits for it to listen, then runs Maestro
scoped by tag. It assumes the backend (Postgres `:6010`, Redis `:6011`,
openthrottle-server `:6021`) is already up.

```bash
# fast PR gate (default tag = smoke)
sh applications/openthrottle-developer/tests/e2e/scripts/run-ci.sh
# the full suite
sh applications/openthrottle-developer/tests/e2e/scripts/run-ci.sh full
```

### GitHub Actions

This suite is **not yet wired into** `.github/workflows/continuous-integration.yml`
on purpose — that pipeline is cost-tuned (Nx Cloud, Blacksmith runners) and
running Maestro Web (a headless browser) plus the full stack should be adopted
deliberately. Drop the job below into a workflow when ready (it brings up the DB
via docker compose, starts the server, then calls the runner):

```yaml
e2e-developer:
  runs-on: ubuntu-latest
  timeout-minutes: 20
  steps:
    - uses: actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd # v5.0.1
    - uses: ./.github/actions/node-setup
    - name: Install Maestro CLI
      run: |
        curl -fsSL "https://get.maestro.mobile.dev" | bash
        echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"
    - name: Start database (Postgres + Redis)
      run: pnpm run database:start && pnpm run database:migrate
    - name: Start the GraphQL server
      run: pnpm nx run openthrottle-server:dev &
    - name: Wait for the server (:6021)
      run: until curl -sf http://localhost:6021/graphql -d '{"query":"{__typename}"}' -H 'content-type: application/json'; do sleep 2; done
    - name: E2E (smoke gate)
      run: sh applications/openthrottle-developer/tests/e2e/scripts/run-ci.sh smoke
      # nightly / pre-release: pass `full` instead of `smoke`.
```

Notes:

- The `smoke` tag is the cheap PR gate; reserve `full` for a nightly or
  pre-release run.
- Pass non-default credentials via `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`
  (consumed by both `run-ci.sh` and `seed-user.sh`).
- Maestro Web is Beta; if CI hierarchy reads are flaky, pin the Maestro CLI
  version and re-run rather than loosening assertions.

## Maestro MCP server

Maestro bundles an [MCP](https://modelcontextprotocol.io) server in the CLI, so an
agent (Claude Code, Cursor) can drive the app and author flows interactively
instead of only shelling out to `maestro test`. Start it with:

```bash
maestro mcp
```

### Registering it

This repo registers the server in **`.mcp.json`** (Claude Code, committed):

```json
{
  "mcpServers": {
    "maestro": { "command": "maestro", "args": ["mcp"] }
  }
}
```

> **Cursor:** the same entry belongs in `.cursor/mcp.json`, but that file is
> **git-ignored** (user global gitignore), so it is **not** committed. Each
> developer must add the `maestro` block to their own local `.cursor/mcp.json`.
>
> **Restart required:** MCP servers load when the client starts. After editing
> `.mcp.json` / `.cursor/mcp.json`, **restart the client** before the `maestro`
> tools appear.
>
> **PATH / Java issues:** if `maestro` is not on `PATH` for the client, set the
> full binary path and `JAVA_HOME` in the entry's `env` block.

### Tools (Maestro CLI v2.0.9)

The bundled server advertises these tools (verified locally — note this differs
from the [docs page](https://docs.maestro.dev/get-started/maestro-mcp), which
lists an older cloud-oriented set):

| Tool                             | Use                                                                  |
| -------------------------------- | -------------------------------------------------------------------- |
| `list_devices` / `start_device`  | Find / boot an emulator, simulator, or browser                       |
| `launch_app` / `stop_app`        | Open / close the app under test (web `url` or native `appId`)        |
| `inspect_view_hierarchy`         | Read the current view tree to find selectors                         |
| `take_screenshot`                | Capture the current screen to verify state                           |
| `tap_on` / `input_text` / `back` | Interactively drive the UI                                           |
| `run_flow` / `run_flow_files`    | Execute inline steps or existing flow YAML (e.g. `flows/smoke.yaml`) |
| `check_flow_syntax`              | Validate flow YAML before running                                    |
| `cheat_sheet` / `query_docs`     | Maestro syntax reference and docs lookup                             |

**Typical agent loop:** `query_docs` / `cheat_sheet` to recall syntax →
`launch_app` + `inspect_view_hierarchy` to discover selectors → `tap_on` /
`input_text` to compose steps → `check_flow_syntax` → save to `flows/` →
`run_flow_files` to confirm green → `take_screenshot` to capture evidence.

### MCP prerequisites

Same as the CLI runbook above: the Maestro CLI on `PATH`, and for **web** flows a
running dev server (`pnpm nx run openthrottle-developer:dev`, port 6020); for
**native** flows a booted emulator/simulator or connected device.

## Layout

```text
applications/openthrottle-developer/tests/e2e/
├── config.yaml      # Maestro workspace config (flows glob, tags, local opts)
├── flows/           # Maestro flow YAML files (one flow per file, kebab-case)
├── helpers/         # Reusable subflows referenced via `runFlow`
├── scripts/         # seed-user.sh (seed the test user) + run-ci.sh (build→serve→seed→run)
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
