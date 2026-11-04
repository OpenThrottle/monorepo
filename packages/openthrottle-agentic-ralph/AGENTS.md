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
- `verify-graphql-codegen` — regenerates and fails on drift (CI gate). This package **commits**
  `src/__generated__/` (the `!src/__generated__/**/*` negation in its own `.gitignore`), and it owns
  the plan/task/note documents every other consumer spreads — which makes this the workspace's live
  CI gate on shared-document drift, including for consumers whose own output is gitignored.
- `test` — includes `src/graphql/__tests__/fragment-coverage.test.ts`, the tripwire on the SHARED
  fragments: every scalar/enum field on a covered schema type (`PlanObject`, `TaskObject`) must be
  selected by its fragment or named in that file's `EXCLUSIONS` with a reason. `openthrottle-mcp`
  tool output is that selection set verbatim, so an unselected field is invisible to every MCP
  caller with nothing going red — which is how `runConfigJson` went missing. This project's `test`
  target lists `applications/openthrottle-server/schema.gql` as an explicit input so a server-side
  field addition invalidates the cache instead of the tripwire passing from it.
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
  globs this directory). Editing these documents means regenerating **both** packages' `__generated__`.
- Keep plan/task transport GraphQL-pure: the single non-plan GraphQL call allowed is the
  `getServerHealth` preflight. Never open a Postgres connection or spawn the agent CLI from here.
  The host-owned plan-end finalize step (push + PR via injectable `runCommand`) is the deliberate
  exception — see `src/utils/finalize-plan-run.ts`.
- **PR draft hand-off (agent drafts, host publishes).** On its final iteration the agent runs the
  `github-pull-request` skill in draft-only mode. The orchestrator marks that iteration explicitly:
  when the task it hands the agent is the plan's only runnable one, it appends
  `FINAL_ITERATION_PROMPT_LINE` (`OT_FINAL_ITERATION=1: …`) to the prompt (`orchestrator.ts`; plan
  mode per iteration, task mode from the state load). The agent can't infer this on its own,
  because completions are applied by the host after it exits. That mode writes `title.txt` (a one-line
  conventional title) and `body.md` (UTF-8, ending in the `Plan-Id:`/`Task-Id:` trailer) into
  `OT_PR_DRAFT_DIR`, and it never runs `gh` or `git push`. When `runCommand` is wired, the
  orchestrator resolves `<worktree git dir>/ot-pr-draft` (`git rev-parse --absolute-git-dir`, the
  skill's own default) once at run start, deletes any stale draft there, and passes it to every
  iteration as `env.OT_PR_DRAFT_DIR` (merged over `process.env` by the drivers engine) and to
  finalize as `draftDir`. That path is untracked and local to each worktree. Finalize treats the
  draft as untrusted (`plan-run-pr-draft.ts`): it checks the conventional title and the absence of
  template `**TODO:**` text, replaces every `Plan-Id:`/`Task-Id:` line with the OT footer set, wraps
  the body in `<!-- ot:plan-run-body -->` markers plus a sha256 digest line, and runs
  `check-pr-attribution.sh`. If a check fails it falls back to `plan-run-pr-body.ts`; either way a
  plan_output line names the source. On an existing PR it refreshes title + body (`gh pr edit`, REST
  `PATCH` fallback) only when `classifyPlanRunPrBody` says `empty` or `host`; a missing marker, text
  outside the markers, or a digest mismatch (an edit inside them) means `edited`, and the body is
  left alone. The contract lives in
  [`skills/github-pull-request/SKILL.md` § Draft-only (orchestrator) mode](../../skills/github-pull-request/SKILL.md#draft-only-orchestrator-mode).
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
