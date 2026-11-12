# @openthrottle/openthrottle-agentic-loop — agent notes

The pure OT Loop parent state machine (`runOtLoop`): selection, flips, per-task work session, validation, commit, cancel and inbox, three-way close. Every side effect is an injected interface (`LoopDeps`); no NestJS, GraphQL or spawning here. The server wires it later (design: [docs/workflows/ot-loop-job.md](../../docs/workflows/ot-loop-job.md)).

## Layout

- [src/index.ts](src/index.ts) — public entry point. Export the package's public
  API here and tag exported public API with `@public` so Knip keeps it.

## Invariants & gotchas

- **Lockstep:** `skills/ot-loop/SKILL.md` § The loop is canonical; this package is a deliberate restatement in code. Change both in one PR.
- Source-first (`exports` → `src`), like `openthrottle-agentic-ralph`; no `build` target to add.
- The task loop is sequential by nature, so it recurses rather than awaiting in a loop.
- Test fakes live in `src/utils/__tests__/loop-fakes.ts`.

## Pointers

- [README.md](README.md) — human-facing overview and usage.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions (package layout,
  `@public` tags, source-first pattern).
