# @openthrottle/agentic-replay-testing — agent notes

Record-and-replay testing for agent CLI sessions: the NDJSON transcript schema, the sanitizer that
makes a recording safe to commit, the record script, and the replay bin plugged in through each
backend's `*_BIN` env override. Test-only tooling; nothing ships it at
runtime.

**Consumed by (devDependency):** `openthrottle-server` —
`conversation-stream.service.integration.test.ts` replays claude transcripts through the real
service and backend with no agentic-utils mock (ids seeded, `Date` frozen).

## Layout

- [src/types/transcript.ts](src/types/transcript.ts) — the schema: header, outbound argv/stdin,
  inbound stdout/stderr, exit.
- [src/utils/transcript/](src/utils/transcript/) — `parseTranscript` (result type, never throws) and
  `serializeTranscript`.
- [src/utils/sanitizer/](src/utils/sanitizer/) — `createSanitizer`, `findSanitizerLeaks`,
  `placeholderUuid`.
- [src/utils/record/](src/utils/record/) — `recordScenario` (drives the production backend) and
  `runRecordingShim` (the `*_BIN` stand-in that runs the real CLI and captures it).
- [src/utils/replay/](src/utils/replay/) — `runReplayBin` (the strict `*_BIN` stand-in),
  `installReplayBin`, `replayFixture` / `replayFixturePath`, and `replayPaths` (the path tokens
  recorder and replay must agree on).
- [src/utils/scenario/](src/utils/scenario/) — `scenarioRun`: the ONE place a scenario turn becomes
  a `ConversationBackendRun`, shared by recorder and replay so their argv can only differ for real.
- [src/utils/plan-run/](src/utils/plan-run/) — the in-memory OT store, the drivers-engine
  iteration runner, and `runPlanRunScenario` (the real orchestrator); `replayPlanRun` /
  `recordPlanRunScenario` sit in `replay/` and `record/`.
- [src/config/config.backends.ts](src/config/config.backends.ts) — per-backend recording profiles:
  bin env, redact keys, host-only stdout lines to drop.
- [src/data/data.scenarios.ts](src/data/data.scenarios.ts) — the shared scenarios.
- [tests/claude.replay.test.ts](tests/claude.replay.test.ts) — every claude transcript through the
  production claude backend. [tests/replay-coverage.guard.test.ts](tests/replay-coverage.guard.test.ts)
  fails when a transcript is not named literally (`replayFixturePath('<backend>', '<stem>')`) by a
  test in this package.
- [src/utils/drift/](src/utils/drift/) — `compareTranscripts` / `stdoutShape`, the structural
  drift comparison behind [scripts/check-drift.ts](scripts/check-drift.ts) (the `check-drift`
  target, run weekly by `.agents/prompts/Job_ReplayDrift.md`).
- [scripts/record.ts](scripts/record.ts) — the `record` target. [fixtures/](fixtures/) — committed
  transcripts, one directory per backend; `tests/fixtures.guard.test.ts` parses and leak-checks all.

## Invariants & gotchas

- **Source-first** (`exports` → `src`, `__build` placeholder). Never add a `build` target.
- **The sanitizer and transcript modules import only node built-ins.** The replay bin runs them
  directly under Node's type stripping, outside Vite and workspace resolution — a workspace import
  there breaks every replay.
- **The bin-side modules import only node built-ins**: `replay-bin.ts`, `replay-paths.ts`,
  `recording-shim.ts`, `sanitizer.ts`, `transcript.ts` and the `types/transcript.ts` they share.
- **`withBinEnv` mutates `process.env`.** Never run two replays concurrently in one process.
- **Paths are listed in every spelling** (`replayPaths`): macOS `/var` vs `/private/var` — a child's
  `process.cwd()` is resolved, a backend-built argv is not.
- **Consumers compile this source against their own `lib`.** openthrottle-server has no ES2023
  (`toSorted`, `findLast`), so `src/` (non-test) code avoids them; tests may use them.
- **Plan-run spawns resolve the CLI off PATH** (`sh -c 'claude -p …'`), not through `*_BIN` — the
  bin goes in as a bare-name alias via `writePathAlias` + `withPathPrepended`.
- **Plan-run prompts must be byte-identical**: placeholder ids from the start (`PLAN_RUN_PLAN_ID`,
  `planRunTaskId`), fixed timestamps, no hook plugin dirs, and the checkout path tokenized as
  `<OT_ROOT>` (derived from `replay-paths.ts`'s own location). Changing any orchestrator prompt text
  makes the plan-run replays fail by design — re-record them.
- **Profiles derive bin env, binary and version flags from the drivers registry** (`profileFor`).
  Adding a backend = one profile with its `sessionStrategy`, `redactKeys` and `dropStdoutLine`, then
  record and inspect the transcripts for host config before committing.
- **A failed scenario writes nothing.** `permission-denied` fails a backend whose supervised posture
  lets the write through — never hand-add that transcript. cursor runs non-`fullAccess` postures as
  `--mode ask`, and opencode writes `edit`/`bash: ask` into its temp config; both were refused here
  before that.
- **Plan-run cwds are git repositories** (`runPlanRunScenario` runs `git init`), as real plan runs
  are; codex refuses to run outside one.
- **One sanitizer instance per scenario** (all its turns), so a session id one turn reports and the
  next sends back share a placeholder.
- **One sanitizer instance per transcript** Its UUID map is stateful so a session id in argv and the
  same id in stdout share a placeholder; reusing an instance across transcripts shifts the indexes.
- **Dependency direction is one way:** this package depends on `openthrottle-agentic-utils`, never
  the reverse — so replay tests for agentic-utils' own parsers live here, not there.
- **Claude's init event describes the recording host** (installed tools — including connected
  integrations — skills, agents, MCP servers, plugins). Its profile redacts those keys and drops the
  `system/hook_*` events; extend the profile, never hand-edit a fixture.
- **The backends scrub the child's env**, so a replay bin cannot learn its transcript from an env
  var — the transcript path is written into the bin script itself.

## Pointers

- [README.md](README.md) — the transcript format.
- [../openthrottle-agentic-utils/AGENTS.md](../openthrottle-agentic-utils/AGENTS.md) — the
  conversation backends this replays through.
