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
packages/openthrottle-showroom/
├── src/fixtures/demo-content.ts  # the hand-authored HERO rows (d0d0d0d0- ids)
├── src/snapshot/              # export/sanitize/load of the real workspace
│   ├── manifest.data.ts       # THE classification: every table and column
│   ├── data/                  # the committed sanitized snapshot (JSONL)
│   └── verify-episodes.ts     # assert each episode's dataRequirements
├── src/episodes/<id>/         # episode.ts, flow.ts, episode-specific surfaces
├── src/scripts/seed-demo.sh   # create + migrate + seed + verify the DEMO database
├── src/scripts/seed-demo.ts   # the seeder (hero rows, then the snapshot)
├── src/scripts/snapshot-export.ts   # refresh the snapshot from the REAL database
├── src/scripts/verify-demo-data.ts  # the episode data gate
├── src/scripts/ensure-demo-database.ts
├── src/scripts/resolve-demo-url.ts
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
sh packages/openthrottle-showroom/src/scripts/seed-demo.sh --reset
```

Creates the database if needed, applies every migration, seeds **two layers**,
then asserts every episode's data requirements:

1. **The hero fixture** — one demo user with all roles, two fictional projects,
   eleven plans, sixteen tasks, four notes and one pre-baked agent run with
   nineteen output chunks. Fixed `d0d0d0d0-` ids, because flows deep-link them.
2. **The snapshot** — ~15,000 rows across 28 tables, a sanitized 30-day slice of
   the real workspace (see below). Imported rows keep their real ids; the loader
   refuses if the two id spaces ever overlap.

Idempotent — every write upserts and is guarded so an unchanged row is not
written at all, and `--reset` truncates first. Pin `DEMO_NOW` to make a run
reproducible to the second: without it the timestamp offsets resolve against the
current clock, so a re-run deliberately re-times the whole workspace (that is
how a frozen snapshot keeps reading as recently active).

Two seeding details that are load-bearing, both learned the hard way:

- **Most of these tables stamp `updated_at` from a trigger.** An unconditional
  upsert therefore rewrites the rebased timestamps on every re-seed, and 200+
  plans read "updated just now" on camera. Every upsert is guarded with
  `IS DISTINCT FROM` so an unchanged row is skipped entirely.
- **Imported rows arrive owned by the imported users**, but the recording logs
  in as the demo user and most surfaces are user-scoped. Ownership is re-pointed
  at the demo user after the load, off the reflected foreign-key graph. Without
  it the workspace holds 125 conversations and still renders "no conversations
  yet".

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

## The snapshot: real workspace data, sanitized and committed

The hand-authored hero fixture above is a few dozen rows; the rest of the demo
workspace is a **sanitized snapshot of the real dev database**, committed as
JSONL per table under `src/snapshot/data/`. The exporter walks the FK graph
mechanically from time-windowed roots (30 days by default), pipes every row
through the committed column manifest (`src/snapshot/manifest.data.ts` —
keep/scrub/drop per column, exported/denied/ignored per table), and fails
loudly on schema drift or anything secret-shaped. Timestamps are stored as
offsets from a fixed anchor so the loader can render the frozen snapshot as a
recently-active workspace.

That anchor is `SNAPSHOT_ANCHOR_ISO` in `src/scripts/snapshot-export.ts`, and it
is **pinned**, not read off the clock. It has to be: every timestamp in the
snapshot is an offset from it, so a clock-derived anchor made the whole 18MB
output a function of the calendar — exporting a day later rewrote every line of
all 29 files with no semantic change. Bump the constant only when you mean to
move the demo window forward, and review the whole-snapshot diff that follows.

### Refreshing the snapshot is a PR — the diff review IS the leak review

```bash
pnpm nx run @openthrottle/openthrottle-showroom:snapshot-refresh
```

The ritual, in order, and none of it optional:

1. Refresh **on a branch**, never straight on main.
2. **Read the diff.** Output is deterministic (stable row order, sorted JSON
   keys, pinned anchor), so the diff is exactly what changed in the workspace
   since the last refresh — a refresh against unchanged data produces no diff at
   all. This read is the human half of the leak review; the automated half is
   best-effort by design.

   `src/snapshot/data/*.jsonl` is marked `-diff` in `.gitattributes` so it does
   not drown PR pages and incidental `git diff` calls in 15k unreadable lines.
   The leak review opts back in explicitly:

   ```bash
   git diff --text -- packages/openthrottle-showroom/src/snapshot/data
   ```

   Start from the row counts in `src/snapshot/data/_tables.json`, which stays
   diffable and is the snapshot's human-readable summary.

3. Merge, then re-seed the demo database (`video-seed`).

What the automation covers: the export refuses to run against anything
unclassified (a new migration stops it, naming the table/column to classify),
denied tables never export, a secret-shaped string stops the export naming the
row, and the committed files are re-scanned by the test target on every CI run
(`src/snapshot/__tests__/snapshot-data.test.ts`) — a leak string added to
`src/snapshot/data/` fails the build. What it deliberately does NOT cover:
imported free text is kept (that is the point of using real data), so
recordings made from imported data are **always human-reviewed before
publishing** — that expectation is part of this pipeline, not a nicety.

### The two things that break first when the schema moves

Both are deliberate, and both name what to do:

1. **The column manifest, at EXPORT time.** `manifest.data.ts` classifies every
   table (`exported | denied | ignored`) and every exported column
   (`keep | scrub | drop`). A new migration means an unclassified table or
   column, and the export stops before writing anything: _"column
   'plans.foo' is not classified — decide keep/scrub/drop"_. Classify it —
   conservatively: `scrub` free text, `drop` anything credential-adjacent,
   `denied` any table that stores secrets — then re-run the refresh. A renamed
   or dropped column is reported as such rather than as a bare Postgres error,
   and a changed pgvector dimension fails loudly so a model change cannot
   silently strand stale embeddings.
2. **The per-episode data requirements, at SEED time.** Each episode declares
   what its flow needs; `verify-demo-data` asserts every requirement after
   seeding and fails naming the episode: _"09-tags-and-rules: expected a tag
   rule that has actually fired …, got 0"_. Either the seed is wrong (re-seed,
   or widen the export window) or the episode's expectation is (fix the
   requirement). Never delete the requirement to make it green.

A third, quieter one: the snapshot comes from the dev database, which can carry
columns the committed migrations do not create yet. The loader skips those and
says so — `WARNING 'plans' snapshot has working_directory — absent from the demo
schema`. A growing list means the dev database has drifted from
`databases/migrations`.

### Size

Measured 2026-08-27: ~17MB across 28 tables as plain JSONL, largest file 4.2MB
(`documentation_embeddings.jsonl`). Committed uncompressed on purpose — gzip
would make the diff unreviewable, which defeats the ritual above. If the
directory ever exceeds **50MB**, narrow the export scope (shorter window, or
demote a bulky table to `ignored`) before reaching for compression;
`code_embeddings` is already denied outright because the code index spans
private local workspaces.

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
pnpm exec tsx packages/openthrottle-showroom/src/runner/run.ts \
  --flow 03-first-plan --base http://localhost:7180
```

Out comes `output/<flow>/frames/` plus `frames.concat` (per-frame durations) and
`manifest.json` (`{beat, kind, tStart, tEnd, narrationCue, target}` per step). The
assembly stage turns those into a master; `--headed` shows the browser while you
iterate on a flow.

A flow is a list of steps whose verbs mirror the script's on-screen-action column —
`navigate`, `click`, `type`, `select`, `hover`, `highlight`, `scrollTo`, `zoomTo`,
`waitFor`, `dwell`, `stage`, `reveal`. Porting a script is transcription, not
interpretation: if a flow needs a step the script does not describe, the script is
wrong.

`--flow <id>` is looked up in `src/episodes/flows.ts`, the flow registry, so an
id that names no flow fails with a list of the ones that do rather than a module
resolution error. **[AUTHORING_FLOWS.md](./AUTHORING_FLOWS.md) is the guide** —
portrait strategy, regions of interest, the `waitFor`-before-`highlight` rule,
and what the four shipped flows settled. **[RECORDABILITY.md](./RECORDABILITY.md)
is the per-beat audit** of every episode that has no flow yet; read your
episode's row before you write a line.

### Beats that are not the app: `stage` and `reveal`

Some scripts are about a command line rather than a page — 05 wires up the MCP server
and six of its eight beats are a shell. Those beats run against a **typeset surface**:
a self-contained HTML document (`surfaces/shell.ts`) that `stage` puts on camera with
`page.setContent`, driven by the same `type`, `press` and `highlight` verbs as a real
page. It is the same call the pipeline already makes for captions and cards, and for
the same reason — the spike settled Playwright over screen capture, and a screen
recording of a real terminal would put the operator's whole desktop in frame.

`reveal` un-hides an element the surface marked `data-demo-hidden`, which is how "the
printed block appears" is one step rather than a second near-identical surface. Hidden
elements are `display:none`, so they are absent from the beat's text dump until the
beat that actually shows them.

Two properties this buys that a screen recording does not: the text on screen is real
DOM, so `scan/leak-scan.ts` gates a shell beat exactly as it gates a page; and every
path and prompt is a parameter, so the frame shows a fictional machine by construction
(`DEMO_MACHINE` in the fixture) rather than by remembering to clean one up.

Surface text that comes from a real command is captured, not retyped:
`surfaces/mcp-instructions.txt` is the verbatim output of
`scripts/setup_mcp-instructions.ts`, and `scripts/__tests__/setup_mcp-instructions.test.ts`
fails if the renderer stops producing it.

### Mutating flows and take 2

The seed is idempotent. A flow is not. `03-first-plan` creates a plan on camera,
and the flows for a rule, a note and a promoted plan will do the same — take 1
leaves the row behind, so take 2 films a list that already contains the thing the
video is about to create, and take 5 films four duplicates.

A flow that writes declares `mutates: true`. `run.ts` then refuses to record it
against a workspace it has already filmed since the last seed, and prints the
re-seed command:

```text
run: refusing to record — '03-first-plan' was last recorded at …, after the demo
     workspace was seeded at …. This flow declares `mutates: true`, so that take
     left its own rows behind and this one would film them.
run: re-seed first:
       sh packages/openthrottle-showroom/src/scripts/seed-demo.sh --reset
```

`--allow-dirty` records anyway, and exists for the case where you reset the
workspace by a route the check cannot see — not as the way past a real warning.

The check compares two mtimes under `output/`: a `.demo-seeded-at` marker the
seeder stamps once the data is actually in place, and the flow's own
`manifest.json`. It is judged **per flow**, so recording a read-only flow never
demands a re-seed, and an absent marker resolves to clean rather than to dirty —
a workspace seeded before this check existed should not fail for a reason with
nothing to do with its data. The reasoning behind refusing (rather than stamping
the created row's title, or rolling it back afterwards) is in
`src/runner/dirty.ts`.

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

It also hides the server-metrics strip (`[data-testid="GlobalMetrics"]`), for a
different reason. That one is real, wanted UI — the leak scan rightly passes it — but
it is developer diagnostics running across the bottom of a marketing video, and its
RSS / heap / CPU numbers differ on every take, so two recordings of the same flow are
never identical. It is hidden at the recording layer rather than gated in the
component, because the panel belongs in the app. A warn-severity `dev-diagnostics`
scan rule catches it if this stops working.

Both are `HIDE_FOR_RECORDING` in `src/runner/run.ts`, injected as a `display: none` rule
after every navigation.

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
