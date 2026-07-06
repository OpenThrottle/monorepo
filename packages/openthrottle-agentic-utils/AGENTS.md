# @openthrottle/openthrottle-agentic-utils — agent notes

Leaf runtime utilities for the agentic stack, extracted incrementally from `@tools/workflows` and
`@openthrottle/ai-mcp`: Postgres URL resolution, OT root discovery, workflow transport/config cwd,
subprocess PATH, debug-env parsing, wall-clock/child-process metrics, and local model-server
discovery.

**Consumed by:** `openthrottle-server`, `openthrottle-developer`, `@openthrottle/ai-mcp`,
`@openthrottle/openthrottle-workflows`, `@openthrottle/openthrottle-agentic-ralph`,
`@openthrottle/nestjs-model-discovery`, `@openthrottle/nestjs-worktrees`, `@tools/workflows`.

## Layout

- `src/utils/` — one file per domain (postgres, workflow, nodejs, metrics) plus
  `model-discovery/` (probe/fingerprint/dedupe of local OpenAI-compatible servers).
- `src/types/` — public type shapes (e.g. `model-discovery.ts`).
- `src/index.ts` — barrel; every public symbol re-exports from here.

## Invariants & gotchas

- No Nx `build` target (`__build`/`__build-package` placeholders — see [../AGENTS.md](../AGENTS.md)),
  but top-level `exports` still map to `dist/` because `openthrottle-server` consumes it at
  runtime. Keep the dist-shaped `exports` intact when moving files.
- Utilities stay **pure**: `model-discovery` never reads `process.env` — callers pass an env-like
  object to `resolveHosts`/`resolvePorts`. Keep new utilities free of framework/transport deps.
- Public API names may be generalized, but **env var names are frozen** for compatibility
  (`POSTGRES_URL`, `WORKFLOW_RALPH_OT_ROOT`, `OPENTHROTTLE_POSTGRES_URL`, …).

## Don't

- Not a home for CLI bins, Cortex GraphQL/Postgres CRUD, job-run-hook runners, or doc-ingestion —
  those stay in `@tools/workflows` until their own migration phase.
- The cached NestJS wrapper over model discovery is `@openthrottle/nestjs-model-discovery`; don't
  add ConfigService/caching here.

## Pointers

- [README.md](./README.md) — module layout table, model-discovery host/port resolution details.
