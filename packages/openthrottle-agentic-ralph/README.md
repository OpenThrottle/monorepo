# @openthrottle/openthrottle-agentic-ralph

**GraphQL-backed Ralph orchestrator.** This is the **active** orchestrator the server uses for the
**Plans queue — orchestrator** surface (in-process in the `openthrottle-server` worker, no nested
`workflow-ralph` child). It runs the same logical loop as the Local CLI (`tools/workflows/src/bin/ralph.ts`
`main()`) — task selection, `<ralph:task-complete>` / `<promise>COMPLETE</promise>` parsing, PENDING
reset on max iterations — but uses **GraphQL** (`executeGraphqlV2` typed documents) for all plan/task
transport instead of direct Postgres, and an **injected** iteration runner for layer-2 execution.

## Where this fits (canonical map)

This is the GraphQL-first orchestrator layer of the Ralph stack and the basis for the
[target architecture](../../tools/workflows/README.md#target-architecture-phase-2). To see **which
path runs when** (Local CLI vs Plans queue spawn vs Plans queue orchestrator):

- **Canonical decision table:** [tools/workflows/README.md → Which path runs when](../../tools/workflows/README.md#which-path-runs-when-canonical-decision-table)
- **Target architecture (Phase 2):** [tools/workflows/README.md → Target architecture](../../tools/workflows/README.md#target-architecture-phase-2)

This surface is reached via the GraphQL mutation **`enqueuePlanRalphOrchestrator`** (BullMQ job
`Agentic Ralph`). The canonical spawn mutation is **`enqueuePlanRun`** (alias `workflowPlanRun`,
deprecated); see the resolver in `applications/openthrottle-server/src/graphql/plans/plans.resolver.ts`.

## Main exports

- **`createWorkflowRalphOrchestrator(deps)`** — implements `WorkflowOrchestrator`. Requires
  `WorkflowRalphOrchestratorDeps`: a bound **`executeGraphqlV2`** (typed documents only) and an
  injected **`iterationRunner`** (e.g. `createCursorWorkflowRalphIterationRunner` from
  `@tools/workflows`). When **`runCommand`** is set (the server deps factory wires
  `createDefaultWorkflowRalphCommandRunner`), a finished plan also runs the host-owned **finalize**
  step: `git push` (through Husky, never `--no-verify`), find-or-create PR, `gh pr ready` (skipped
  for a plan that ends `BLOCKED` — see [How a run ends](#how-a-run-ends)), and
  return `headSha` / `prNumber` for settle-time work-ledger artifacts. The orchestrator never
  opens a Postgres connection or spawns the agent CLI itself; worktree provisioning stays on the
  server. A non-host (docker) worker without `git`/`gh` credentials fails finalize into
  `workflow_complete_handoff_owed` (never FAILED) — the agent container is not asked to push.
- **Contract + config + utils:** Ralph context builders, codegen GraphQL documents, agent-output
  parsing, and the `WorkflowRalphOrchestratorDeps` contract (`src/contract`, `src/config`, `src/utils`).

The **single health-check exception**: the orchestrator's first GraphQL call is a `getServerHealth`
read-before-write preflight; everything else is plan/task fetch, status updates, and plan-output
streaming over GraphQL.

## Dependency direction

Depends on **`@openthrottle/openthrottle-agentic-workflow`** (transport-free contracts) and
**`@openthrottle/nodejs-graphql`** (`executeGraphqlV2`). Nest DI wiring + tokens live in
**`@openthrottle/nestjs-agentic-workflow`** (`AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS`).

## Installation

**In this monorepo:** add `"@openthrottle/openthrottle-agentic-ralph": "workspace:^"` to the
consuming package's `package.json`, then run `pnpm install` from the repository root.

**pnpm:**

```bash
pnpm add @openthrottle/openthrottle-agentic-ralph
```

> [!Tip]
> This package is **private** to the workspace and is not published to a public registry.

## Configuration precedence

Run tuning merged into the orchestrator follows **enqueue / GraphQL tuning → env → `.workflow-ralph.json` → built-ins**. **GraphQL URL and auth tokens are env-only** (never read from the defaults file). See `src/utils/context.ts`, `docs/workflows/ralph-config-migration.md`, and `tools/workflows/README.md`.

### Cost / budget guard

In addition to `iterations` (a count) and the per-iteration timeout, the orchestrator enforces a
**cumulative wall-clock budget** to bound cost on a stuck plan. Set `OPENTHROTTLE_RALPH_MAX_TOTAL_MS`
(milliseconds, env-only) for an explicit ceiling; otherwise it derives one from
`perIterationTimeoutMs × iterations`. When the budget is exhausted the run finishes with reason
`workflow_budget_exhausted` (checked in the per-iteration guard, before the next agent invocation).

### How a run ends

**A run that can make no further progress ends the plan `BLOCKED`** — it never leaves the plan
`IN_PROGRESS` or `QUEUED`, where it would look runnable and hold up the queue. It still pushes the
branch and opens a **draft** PR (never `gh pr ready`) whose body lists the blocked and pending
tasks; finalize skips push and PR when the branch has no commits ahead of base. A human unblocks
the plan and re-enqueues it — nothing re-queues a `BLOCKED` plan automatically.

Tasks split into **workable** (`PENDING` / `QUEUED` / `IN_PROGRESS`, not a runner hook) and
**remaining** (workable + `BLOCKED`). Task picking, the loop exit and the `OT_FINAL_ITERATION=1`
line use the workable list, so a `BLOCKED` sibling never suppresses the PR draft.

| Finished reason                                         | Plan status                                       | Finalize                        |
| ------------------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| `workflow_complete` / `workflow_tasks_exhausted`        | `COMPLETED` (nothing remaining)                   | push + PR, marked ready         |
| `workflow_tasks_blocked`                                | `BLOCKED` (no workable task, some `BLOCKED`)      | push + draft PR, no agent spent |
| `workflow_max_iterations` / `workflow_budget_exhausted` | `BLOCKED`, or `COMPLETED` if the last turn did it | push + draft PR                 |
| `workflow_cancelled` / `workflow_usage_limited`         | unchanged (usage limits auto-resume)              | none                            |

The server backstops this: a finished outcome that still leaves the plan `IN_PROGRESS` or `QUEUED`
is settled `BLOCKED`, and the startup reconcile writes `BLOCKED` (or `COMPLETED`) instead of
re-queuing a plan with no workable task (`plans.processor.ts`).

### Prompt injection layering (trusted inputs)

The orchestrator prompt injects, in order: the operator `prompt`, any foreign-workspace layer, the
plan/task content (`title` / `description` / `requirements`) fetched from OpenThrottle, and finally
the shell-command guardrail (`WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL`) as the **last** instruction
layer. These injected inputs are **trusted-operator inputs** today and are injected verbatim. Keeping
the guardrail last is intentional defense-in-depth: its command-execution safety rules are the final
instruction the agent reads and are not overridden by injected content. If plan content ever becomes
attacker-influenced, that ordering — and additional sanitization — becomes load-bearing.
