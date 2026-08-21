# openthrottle-developer · demo workspace and screencast pipeline

This directory produces the videos on [@OpenThrottleAI](https://youtube.com/@OpenThrottleAI).
It sits beside `../e2e/` on purpose: a demo video is structurally an E2E flow — a
deterministic, seeded, scripted click-path through the real app — and both suites
must drive the **same** selectors so the app never grows two parallel sets of test
hooks.

Format spec and scripts live in [`docs/marketing/`](../../../../docs/marketing/README.md).
The recorder decision is in [`spike/README.md`](./spike/README.md).

## Layout

```text
tests/demo/
├── fixtures/demo-content.ts   # the entire demo workspace, as fictional data
├── scripts/seed-demo.sh       # create + migrate + seed the DEMO database
├── scripts/seed-demo.ts       # the seeder (upserts on fixed ids; --reset)
├── scripts/ensure-demo-database.ts
├── scripts/resolve-demo-url.ts
├── spike/                     # task-3 recorder comparison + verdict
└── output/                    # captures and masters (gitignored)
```

## The demo database is separate, and that is not negotiable

The demo workspace is its **own Postgres database** (`openthrottle_demo`), not a
scoped user inside the dev database.

The task-3 spike settled it with evidence: recording the dev instance captured a
dashboard with **834 plans carrying real internal titles**, including in-flight
work. Row-level scoping does not fix that, because the dashboard's counters, the
activity chart and search all read across the workspace. The only reliable control
is a database that contains nothing but fiction — which is why
[`fixtures/demo-content.ts`](./fixtures/demo-content.ts) is the primary
leak-prevention control for the whole pipeline, not just a convenience.

## Seeding

```bash
sh applications/openthrottle-developer/tests/demo/scripts/seed-demo.sh --reset
```

Creates the database if needed, applies every migration, and seeds: one demo user
with all roles, two fictional projects, ten plans across statuses, thirteen tasks
in mixed lifecycle, four notes, and one pre-baked agent run with nineteen output
chunks. Idempotent — every write upserts on a fixed id, so re-running is a no-op
and `--reset` truncates first.

Then point a server at it:

```bash
OPENTHROTTLE_POSTGRES_URL='postgresql://openthrottle_user:openthrottle_password@localhost:6010/openthrottle_demo' \
  pnpm nx run openthrottle-server:dev
```

### `POSTGRES_DB` does not work here — use `OPENTHROTTLE_POSTGRES_URL`

`getPostgresUrl()` resolves `OPENTHROTTLE_POSTGRES_URL` → `POSTGRES_URL` → the
`POSTGRES_*` pieces, and `applications/openthrottle-server/.env` sets
`POSTGRES_URL`. So `POSTGRES_DB=openthrottle_demo` at a server is **silently
ignored**: it keeps talking to the dev database, and you find out when the demo
login fails with "Invalid email or password" against a user that demonstrably
exists. Both guard scripts check the _resolved_ connection string rather than
`POSTGRES_DB` for exactly this reason, and refuse to run unless the database name
contains `demo` (the reset path truncates).

## Two things the fixture has to get right

**Timestamps are offsets, not dates.** The UI renders relative time, so an absolute
fixture drifts every take and eventually reads "8 months ago". Every fixture
timestamp is minutes-before-seed-time. Recording therefore happens _right after_ a
seed; set `DEMO_NOW` to an ISO timestamp for a byte-reproducible run.

**The pre-baked run is `COMPLETED`, not `IN_PROGRESS`.** Seeding it in progress
looks correct for about two minutes, and then the server's stale-run sweep finds a
run with no live heartbeat, marks it stale and reconciles the plan back to
`PENDING` — so take 1 and take 7 disagree and the status badge is wrong on camera.
A finished run still renders its whole output stream, which is all the replay flows
need; "live" comes from the flow scrolling the stream, not from a live process.

## Recording a flow

```bash
pnpm exec tsx applications/openthrottle-developer/tests/demo/runner/run.ts \
  --flow 03-first-plan --base http://localhost:7180
```

Out comes `output/<flow>/frames/` plus `frames.concat` (per-frame durations) and
`manifest.json` (`{beat, kind, tStart, tEnd, narrationCue, target}` per step). The
assembly stage turns those into a master; `--headed` shows the browser while you
iterate on a flow.

A flow is a list of steps whose verbs mirror the script's on-screen-action column —
`navigate`, `click`, `type`, `select`, `hover`, `highlight`, `scrollTo`, `zoomTo`,
`waitFor`, `dwell`. Porting a script is transcription, not interpretation: if a flow
needs a step the script does not describe, the script is wrong.

There is deliberately **no `sleep` verb**. Waits are on app state, so a slow machine
stretches the recording instead of desynchronising it. `dwell` is the single
intentional pause, and it is pacing for the narration rather than a wait for the app.

### What the runner does that a plain capture does not

- **A synthetic cursor** with cubic ease-in-out and a click ring. Headless Chromium
  draws no pointer, and things clicking themselves is the single loudest "this was
  automated" tell. Movement is driven from Node in ~16ms steps rather than a
  page-side `requestAnimationFrame` loop, because rAF does not run reliably in a
  page the browser considers hidden.
- **Typing at ~50 wpm with jitter**, and the jitter is derived from the character
  rather than a random source, so two runs of the same flow type identically.
- **`deviceScaleFactor: 2` with the screencast capped at 1920×1080**, so the page
  renders at twice the target and the frame is downsampled. That is what keeps small
  UI text crisp.
- **Dark mode forced.** Headless Chromium defaults to light; every overlay card is
  designed on the brand near-black.
- **Login before capture starts.** A screencast opens on the payoff, not a login
  form, so authentication is setup rather than content.

### Two things the demo server needs

- **`GITHUB_USER=atlas-ada`.** Plan creation requires an author unless the server
  supplies a default, and without it `03-first-plan` silently fails to create
  anything (the form gives no error — see the plan-create follow-up). Setting it
  keeps the recorded flow to the fields the script actually describes.
- **A production build, not the dev server.** Dev mode is not representative, and
  the login form's prefill is development-only — which is why the runner types
  credentials rather than submitting a prefilled form the way the Maestro helper
  does.

## Chrome kept out of frame

The runner hides the editor deep-link buttons (`cursor://`, `vscode://`,
`claude://`) that render above the plan form, because their href embeds a hard-coded
absolute path and would put a real home directory on camera. That is a recording
workaround; the buttons want fixing in the app.

## Recording

Everything is fictional, so a recording never shows a real repository, branch,
email or person:

| Real thing | Demo stand-in             |
| ---------- | ------------------------- |
| user       | `ada@atlasworks.example`  |
| org        | Atlas Works               |
| projects   | `atlas-api`, `atlas-web`  |
| branch     | `feat/rate-limit-per-key` |

Adding a video? Add its plan to the fixture. Never point a flow at real data
because "it is only a screenshot".
