# @openthrottle/openthrottle-agentic-ralph — agent notes

GraphQL-only Ralph orchestrator: the active "Plans queue — orchestrator" surface
(`enqueuePlanRalphOrchestrator`), running in-process in the `openthrottle-server` worker with an
injected iteration runner. All plan/task transport is typed GraphQL (`executeGraphqlV2`) — no
Postgres, no CLI spawn, no worktree workflow.

**Consumed by:** `openthrottle-server`, `@openthrottle/nestjs-agentic-workflow` (Nest DI wiring +
tokens), `@openthrottle/openthrottle-workflows`, and `@tools/workflows` (deprecated shim layer —
see [tools/AGENTS.md](../../tools/AGENTS.md)).

## Commands

- `pnpm nx run @openthrottle/openthrottle-agentic-ralph:codegen-graphql` — regenerate
  `src/__generated__/` from `src/graphql/ralph/*.graphql` (schema read from
  `applications/openthrottle-server/schema.gql`; no running server needed).
- `verify-graphql-codegen` — regenerates and fails on drift (CI gate).
- `build` (real target) `dependsOn` `codegen-graphql`, so a plain build self-heals; bare
  `typecheck`/`test` on a fresh checkout do not — run codegen first.

## Layout

- `src/graphql/ralph/` — the **canonical shared** plan/task/note/project/commit GraphQL documents.
- `src/__generated__/` — codegen output; only a `.gitkeep` is committed.
- `src/contract/` — `WorkflowRalphOrchestratorDeps` (bound `executeGraphqlV2` + injected `iterationRunner`).
- `src/config/`, `src/utils/` — run tuning merge, Ralph context builders, agent-output parsing.

## Invariants & gotchas

- Built package (real `build`/`build-package` targets, `exports` → `dist/`) — see
  [../AGENTS.md](../AGENTS.md) for the pattern.
- `src/graphql/ralph/*.graphql` is also consumed by `openthrottle-mcp`'s codegen (its `codegen.ts`
  globs this directory). Editing these documents means regenerating **both** packages' `__generated__`
  — see [docs/workflows/ralph-mcp-vs-graphql-consolidation-adr.md](../../docs/workflows/ralph-mcp-vs-graphql-consolidation-adr.md).
- Keep the orchestrator GraphQL-pure: the single non-plan call allowed is the `getServerHealth`
  preflight. Never open a Postgres connection or spawn the CLI from here.
- Config precedence is enqueue/GraphQL tuning → env → `.workflow-ralph.json` → built-ins; GraphQL
  URL and auth tokens are **env-only**, never read from the defaults file (`src/utils/context.ts`).

## Don't

- Don't add NestJS or Postgres dependencies — DI wiring belongs in
  `@openthrottle/nestjs-agentic-workflow`; transport-free contracts belong in
  [`openthrottle-agentic-workflow`](../openthrottle-agentic-workflow/).

## Pointers

- [README.md](./README.md) — execution-surface map, main exports, config precedence.
- [tools/workflows/README.md § Which path runs when](../../tools/workflows/README.md) — canonical
  decision table for the three Ralph surfaces.
