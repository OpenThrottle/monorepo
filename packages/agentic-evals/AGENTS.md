# @openthrottle/agentic-evals — agent notes

Eval core for agent CLIs (ADR: [eval-system-adr.md](../../docs/openthrottle/eval-system-adr.md),
Decisions 7, 8, 9, 11). Pure TypeScript — no NestJS, no database. Entities, resolvers and queue
wiring belong in `nestjs-repositories` / `openthrottle-server`, not here.

**Consumed by:** nothing yet; `openthrottle-server` (via a later task) and the MCP tool-selection
eval (task 12).

## Layout

- `src/types/` — `EvalCase`, `EvalDataset`, `EvalRunConfig`, `EvalTrial`, `Grader`, `GraderVerdict`, `EvalGrade`.
- `src/runner/` — `runEval` plus `runDriverIteration`, the default (injectable) agent call.
- `src/workspace/` — `EvalWorkspaceFactory` and the git-worktree implementation.
- `src/judge-cache/` — judge-call verdict cache. Judges only; agent trials are never cached.
- `src/stats/` — pure statistics; every file has a test whose expected values cite a source.

## Invariants & gotchas

- **Built tier, not source-first.** A server-consumed package needs a top-level `exports` to
  `dist/` and a real `build` target ([packages/AGENTS.md](../AGENTS.md)). ESM + NodeNext, so relative
  imports carry `.ts` (`eslint --fix` writes them). Its deps (`openthrottle-drivers`,
  `openthrottle-agentic-utils`) are source-first; Node loads them through the workspace symlink.
- **Drivers run `<binary> ...` off PATH.** `buildShellCommand` hardcodes `codex exec ...`; the
  `binEnv` override only affects discovery and chat. To stub a CLI, put a script of that name first
  on PATH via `runEval({ env })`.
- **Graders run before the workspace is disposed**; `EvalTrial.workspaceCwd` is dead afterwards.
- **`usage_limited` trials get no grades** and the run returns a `cursor`; keep that contract, the
  stats and the resume path rely on it.
- **No throwing across the stats API.** Invalid input gives `null` or an `error` result.
- Exports that are package public API carry `@public` so Knip keeps them.
