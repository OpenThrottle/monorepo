# @openthrottle/openthrottle-agentic-loop — agent notes

The pure OT Loop parent state machine (`runOtLoop`): selection, flips, per-task work session, validation, commit, cancel and inbox, three-way close. Every side effect is an injected interface (`LoopDeps`); no NestJS, GraphQL or spawning here. The server wires it later (design: [docs/workflows/ot-loop-job.md](../../docs/workflows/ot-loop-job.md)).

## Layout

- [src/index.ts](src/index.ts) — public entry point. Export the package's public
  API here and tag exported public API with `@public` so Knip keeps it.

## Invariants & gotchas

- **Lockstep:** `skills/ot-loop/SKILL.md` § The loop is canonical; this package is a deliberate restatement in code. Change both in one PR.
- Source-first (`exports` → `src`), server-consumed through its `exports`; no `build` target to add.
- The task loop is sequential by nature, so it recurses rather than awaiting in a loop.
- **The finish step lives here** (`finalizePlanRun`, `finalizeOtLoopRun`, the PR body/draft helpers). Its
  only OpenThrottle access is the injected `PlanRunFinalizePort` (append output, read plan, read tasks);
  the server implements it in `applications/openthrottle-server/src/queues/ot-loop/ot-loop-finalize-port.factory.ts`.
  The loop never imports a GraphQL client or generated document, and depends on `agentic-utils` and
  `drivers` only.
- **Plan-run config** (`utils/plan-run-config.ts`, `utils/mergePlanRunTuningWithConfig.ts`): `loadPlanRunConfig` reads the optional `defaults` block of the repo's `.openthrottle/ot-loop.json` (the same file `resolveOtLoopCommands` reads for `validation`/`setup`/`finalValidation`), then env. It uses `node:fs`, so it stays out of any barrel a browser bundle reaches (the developer app does not import this package). Env-name constants live in `data/plan-run-config.ts`, not in the diagnostics code, which is what keeps the loader free of an import cycle.
- Test fakes live in `src/utils/__tests__/loop-fakes.ts`.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout,
  `@public` tags, source-first pattern).
