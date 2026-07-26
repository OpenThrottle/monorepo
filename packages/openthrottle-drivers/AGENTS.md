# @openthrottle/openthrottle-drivers — agent notes

The OT-central contract for invoking agent CLIs (Claude Code, Codex, Cursor, Grok,
OpenCode). Each CLI is one `defineDriver(...)` module; a shared engine
(`runDriverSync`/`runDriverAsync`) runs it. Extracted from
`tools/workflows/src/bin/run-iteration.ts`.

**Consumed by:** `@tools/workflows` (run-iteration adapter),
`@openthrottle/openthrottle-agentic-utils` + `@openthrottle/openthrottle-agentic-workflow`
(runner-id re-exports), and transitively `openthrottle-server`.

## Layout

- `src/registry/` — `DRIVER_IDS`, `DriverId`, `defineDriver`, `isDriverId`,
  `parseDriverId`, `lookupDriver`. Imports NO driver module (keeps it acyclic).
- `src/drivers/` — one file per CLI + `index.ts` that assembles `ALL_DRIVERS`,
  `DRIVER_REGISTRY`, and `getDriver`.
- `src/engine/` — `runDriverSync`/`runDriverAsync` (spawn/timeout/abort/streaming).
- `src/types/` — `AgentDriver`, `DriverCapabilities`, `DriverInvocationConfig`, …
- `src/errors/` — `UnknownDriverError`, `UnsupportedDriverModeError`.
- `src/utils/` — `shell.ts` (escaping), `worktree.ts` (capability-gated `-w` flags),
  `logger.ts` (injectable `DriverLogger`), `child-kill.ts` (SIGTERM→SIGKILL).

## Invariants & gotchas

- **Node-only.** Uses `child_process`; never import from browser/RR code.
- **Leaf package.** Zero workspace dependencies — the agentic packages and
  tools/workflows depend on THIS, not the reverse. Do not import from
  `openthrottle-agentic-*` here (it would create a cycle).
- **Registry ↔ drivers split** avoids a cycle: driver modules import `defineDriver`
  from `registry/`, so the assembled `DRIVER_REGISTRY`/`getDriver` live in
  `drivers/index.ts`, not `registry/`. Keep it that way.
- **`DRIVER_IDS` and `ALL_DRIVERS` must stay in lockstep** — add a new id to both.
- **Byte-identical parity** with the legacy builders is a hard contract for
  `claude`/`cursor`: the unchanged `tools/workflows` `run-iteration.test.ts` runs
  against these drivers. Claude emits `claude -p …` (NOT `--bare`). Don't "fix" it.
- **Widening `DRIVER_IDS` ripples**: `WORKFLOW_RUNNER_IDS` derives from it, and the
  `plan_runs.execution_backend` CHECK (databases/migrations/079) + server
  `PlanRunExecutionBackend`/guard enumerate the same set. Add a migration + widen
  those surfaces when you add a runnable id.
- Built package (real `build`/`build-package`, `exports` → `dist/`) — server consumes
  it at runtime, so relative imports use `.ts` extensions. Tag public API `@public`.

## Pointers

- [README.md](./README.md) — API list, capability matrix, "adding a new agent CLI".
- [tools/workflows/README.md](../../tools/workflows/README.md) — Ralph "which path runs when".
- [../AGENTS.md](../AGENTS.md) — parent-tier package conventions.
