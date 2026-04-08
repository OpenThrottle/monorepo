# 🧰 @tools/workflows

We're building out things like Agentic Ralph but in TypeScript packages. These shell scripts are getting unruly and we can do better.

## Building

Run `pnpm nx run @tools/workflows:build` from the monorepo root to build the library.

## Executables

This package makes use of the `bin` folder and package.json conventions to allow us to trigger various scripts from the CLI with ease.

- The TypeScript file need to be compiled
- The TypeScript must make use of the shebang
- ex: `pnpm exec workflow-lighthouse`

### Bins

- `workflow-link-merge` — link the squash commit (after PR merge) to an OpenThrottle (OT) plan; run with `--plan <uuid> --sha <squash-sha> --repo <owner/repo>` (Option A: no pre-merge linking). See **Commit links (Option A workflow)** in `databases/cortex/README.md` for when to link and how activity tools use `commit_links`.
- A future `workflow-commit` script could optionally standardize commits after task completion (conventional message + Plan-Id/Task-Id footer); for now use `/github/commit` or manual `git add` / `git commit` with the footer.
- `workflow-ralph` — agentic Ralph workflow (plan execution; OT plan/task UUID only). **Typed orchestrator (GraphQL + injected runner):** `@openthrottle/openthrottle-workflows` exports **`createWorkflowRalphOrchestrator`** for the same pipeline without binding to this CLI’s subprocess; see that package’s README. **Debug / hangs:** enable the shim logger via `WORKFLOW_RALPH_DEBUG=1` or `--debug` (see [Debugging Ralph (shim logger)](#debugging-ralph-shim-logger)). **Prompt + run tuning defaults:** optional `.workflow-ralph.json` in the cwd and `WORKFLOW_RALPH_*` env vars (`WORKFLOW_RALPH_PROMPT`, `WORKFLOW_RALPH_PROMPT_FILE`, `WORKFLOW_RALPH_ITERATIONS`, `WORKFLOW_RALPH_ITERATION_TIMEOUT`, `WORKFLOW_RALPH_MODEL`, `WORKFLOW_RALPH_PROJECT`, `WORKFLOW_RALPH_BACKEND`); precedence is CLI > env > file > built-ins. **Prompt text:** use `--prompt` (command-style, default `/agents/ralph`), or `--prompt-file <path>` / `--prompt-stdin` for UTF-8 body (see `pnpm exec workflow-ralph --help`). Full flags and env are in `--help`.
- `workflow-nx-validate` — Nx validation.
- `workflow-lighthouse` — Lighthouse audits.

See `docs/oclif-research.md` for past oclif evaluation and migration notes.

### One-off scripts

- **associate-completed-plans-with-nx-projects** — For each OT plan with status COMPLETED, infers an NX project from title, description, summary, and task titles; ensures a `projects` row and sets `plan.project_id`. Run with `pnpm exec tsx tools/workflows/scripts/associate-completed-plans-with-nx-projects.ts` (optional `--dry-run`). Requires OpenThrottle (OT) and NX project graph.

## Workflow Ralph

Ralph runs the agentic process (prompt + plan) for a fixed number of iterations. **Single workflow:** Cortex only — plan and tasks live in the Cortex DB; progress is the plan, tasks, and `plan_output_stream`. There is no file-based or DB-optional mode; all entry points (ralph, link-merge, scripts under `scripts/`) require Cortex and fail fast at startup if config is missing or the DB is unreachable. Implementation: one flow in `src/bin/ralph.ts` (see the numbered flow in `main()`); shared Cortex helpers and fatal-error prefix live in `src/utils/cortex-ralph.ts`.

- **Simplified flow (DB required):** One path only in `ralph.ts`: (1) Cortex required → `getCortexConfigOrExit()` → `ensureCortexReachableOrExit(config)`. (2) Resolve plan/task (from `--plan` or from task’s plan when `--task` only). (3) Fetch plan and tasks from Postgres; exit if plan not found; inject into prompt. (4) Set plan and current task to IN_PROGRESS. (5) Run agent → parse `<ralph:task-complete>` and `<promise>COMPLETE</promise>` → update task statuses. (6) Exit on COMPLETE, ERROR, or INPUT_REQUIRED (see **Exit conditions** below).
- **Exit conditions (order of checks):** (1) Plan already **COMPLETED** or **SKIPPED** at start → log and exit(0); agent not run. (2) Plan-centric and **no remaining tasks** at start of an iteration → set plan COMPLETED, log, exit(0); agent not run. (3) After agent output: **parseRalphResponse** sees ERROR or INPUT_REQUIRED → exit(1); **COMPLETE** → exit(0). (4) Loop end: **max iterations** reached without early exit → exit(0). See the comment block in `src/bin/ralph.ts` for the same order. **Verification:** To verify the no-remaining-tasks exit, mark all tasks of a plan COMPLETED in OT, then run `pnpm exec workflow-ralph --plan <id>`; Ralph should log "Plan … has no remaining tasks; Ralph is exiting." and exit with code 0 without running the agent. To verify plan-already-complete exit, run Ralph with a plan whose status is already COMPLETED or SKIPPED; it should log and exit(0) immediately.

- **Max iterations and task cleanup:** When Ralph hits the iteration cap (e.g. `--iterations 10`) and there is still work to do (remaining tasks), the loop exits with code 0 and logs "All iterations have completed. Exiting...". **Current behavior (without cleanup):** The task that was set to **IN_PROGRESS** for the last iteration can be left stuck in that state if the agent did not emit `<ralph:task-complete>` or `<promise>COMPLETE</promise>`. **Desired cleanup:** Before exit(0), the CLI sets that task back to **PENDING** so the next plan run (or re-queue) can pick it up. Automatic re-queue in the plans processor (e.g. re-adding the job when Ralph exits due to max iterations) is intentionally not done—it is costly; cleanup in `workflow-ralph` is sufficient. See plan 970aecc7-c647-4948-aa20-410e1bd090fc and `docs/workflows/ralph-design.md` § Max iterations and task cleanup.

- **Prompt (source of truth):** `.cursor/commands/agents/ralph.md`
- **`--plan`:** OpenThrottle (OT) plan ID (UUID). Ralph loads plan and tasks from Postgres and injects them into the prompt; the agent should not call `get_plan` or `get_tasks_by_plan_id`. Ralph updates task status from `<ralph:task-complete>` and `<promise>COMPLETE</promise>`; iteration output can be logged via OT MCP `append_plan_output` / `get_plan_output` if the agent has MCP.
- **`--task`:** Cortex task ID (UUID). Task-centric mode: work on a single task; plan is resolved from the task when `--plan` is omitted.
- **Cortex required:** Plan/task mode requires Cortex to be configured and reachable. Set `POSTGRES_URL` or `POSTGRES_*`; the CLI fails fast with a clear error if the DB is unreachable.
- **No ref file:** Ralph does not write a ref file. Ralph injects plan and tasks into the prompt; the agent need not call OT MCP for plan/tasks.

### `getServerHealth` vs workflow GraphQL transport errors (Ralph startup)

- **Ralph `workflow-ralph` startup does not use `getServerHealth`.** It uses `ensureCortexReachableOrExit` in `src/utils/cortex-ralph.ts`: a direct Postgres TCP check with the **CLI process** `POSTGRES_*` (or URL). That is the right preflight for loading plans and tasks from Cortex in this binary.
- **`getServerHealth`** (GraphQL query `serverHealth`, same data as REST `GET /health`) runs only after a successful HTTP POST to the GraphQL endpoint. It reports `api` (ok when the resolver runs), `database` (Cortex DB from the **openthrottle-server** process config via `HealthService`), `redis`, and `websocket`. The resolver is `@Public()` in `applications/openthrottle-server/src/graphql/health/health.resolver.ts`, so no bearer token is required for this query.
- **Thrown errors from workflow GraphQL:** `@openthrottle/openthrottle-workflows` uses **`executeWorkflowGraphqlV2`**, which delegates to **`executeGraphqlV2`** in `@openthrottle/nodejs-graphql`. Non-OK HTTP responses throw `Error` messages shaped like `openthrottle-server GraphQL error <status>: …` (first GraphQL error message or HTTP status text). GraphQL `errors[]` with HTTP 200 throw `GraphQL errors: …` (first message). There is no separate workflow-side discriminant mapper; callers use try/catch and parse or log the message. This answers “did the POST succeed and return data?” but does not expose DB/Redis fields from health JSON.
- **Complement, not replacement:** A `getServerHealth` preflight **does not replace** handling thrown transport errors. Failures before a successful POST never return health fields. When the POST returns 200, `getServerHealth` can **add** signal (e.g. `database: unreachable` while the HTTP stack is fine). Wrong URL, TLS, or proxy errors remain transport failures without health JSON.
- **Parity gap:** `serverHealth.database` reflects the **API server’s** Cortex connectivity; Ralph’s check reflects the **workflow CLI’s** Cortex env. They can disagree if connection strings or networks differ between processes.

Optional follow-up: call `getServerHealth` before other workflow GraphQL for richer diagnostics in tools that use **`executeWorkflowGraphqlV2`**; keep Ralph’s Postgres check as-is for core startup.

- **Test run:** Plan `11290613-8484-44fe-853a-d9bec535d9a9` (Test #2) completed via Ralph; task `b3466d60-45db-45d0-804c-51f69a5a03ae` closed. Plan `d3f01693-7fa1-4c0f-a619-970d982214c5` (Test #6) completed via Ralph; task `171c3dab-58a9-4104-8916-2893d56fa869` closed. Plan `f3408cc7-5ee6-47f2-8db5-d2dd3ccbe4c8` (Test #7) completed via Ralph; task `e3c4ffa7-c44c-4179-9b6b-ec3e923d9dbd` closed. Plan `32d1a4f1-4b40-4032-8178-f8fd39363b65` (Test #10) completed via Ralph; task `987a9f11-ab24-4eb2-8b52-152a8937c13f` closed. Plan `5efeca89-f57c-43d9-b13a-e2486e46e40c` (Test #13) completed via Ralph; task `4f47a9a9-6cca-483d-8a77-d34829007bbd` closed.
- **Task status updates (plan-centric):** When running with `--plan` only (no `--task`), Ralph fetches tasks each iteration, picks the first IN_PROGRESS or first PENDING task, sets it to IN_PROGRESS, and injects into the prompt the current task UUID and: "When you complete it output `<ralph:task-complete>uuid</ralph:task-complete>` so the CLI can mark it completed." When the agent outputs that signal, Ralph marks the task COMPLETED in Cortex. If the agent outputs `<promise>COMPLETE</promise>` but omits the tag, Ralph marks the current iteration's task COMPLETED so Cortex stays in sync.
- **Commit as you go:** After each task (or logical chunk), commit and push with conventional commits; include `Plan-Id` and `Task-Id` in the commit body or footer. Do **not** link those commits in Cortex; link only the squash commit after PR merge via `workflow-link-merge` (see **Commit links** in `databases/cortex/README.md`).
- **Design:** `docs/workflows/ralph-design.md`. **Runtime config (agents, limits, prompts):** `docs/workflows/ralph-workflow-runtime-config.md`. PRD attribute mapping (required / inferred / optional): `databases/cortex/README.md`. **Cross-repo:** See **Cross-repo usage** below.

### Execution backend (layer 2)

Ralph selects **one** runner implementation per process via `--backend` (default `cursor`), or `WORKFLOW_RALPH_BACKEND` / optional `backend` in `.workflow-ralph.json`, with the same precedence as other defaults (CLI > env > file > built-in). The binary stays `workflow-ralph`; additional backends are implemented behind this switch in `src/bin/run-iteration.ts`, not as separate executables.

| Backend id | Runner                                                                    | Layer 1 (prompt profile)                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cursor`   | Cursor CLI `cursor-agent --force -p "<full prompt>"` (optional `--model`) | **Named:** command-style path (e.g. `/agents/ralph`) as the start of the injected prompt string. **File / stdin:** `--prompt-file` / `--prompt-stdin` supply the same string shape (full text before plan/task injection); use a file path to reference `.cursor/commands/...` without duplicating content. |

Other backends are not implemented yet; unknown `--backend` values fail at config parse time with a clear error. Nested runs (`runChildJob`, worktrees) forward `--backend` when it differs from the default so automated runs match manual CLI behavior.

**Embedded orchestrator (BullMQ / in-process):** Import **`createCursorWorkflowRalphIterationRunner`** from `@tools/workflows` to build a `WorkflowRalphIterationRunner`-compatible object for `createWorkflowRalphOrchestrator` (`@openthrottle/openthrottle-workflows`). It wraps **`runIterationAsync`** with the same field mapping as the plans queue worker; optional **`onChunk`** and **`appendPlanOutput`** (per-chunk text + iteration) forward stdout/stderr for logs or OpenThrottle `append_plan_output` while the resolved promise remains the full iteration string. See `src/utils/cursor-workflow-ralph-iteration-runner.ts`.

```bash
# See the usage
pnpm exec workflow-ralph

# Plan-centric: work on a plan by ID (UUID)
pnpm exec workflow-ralph --plan <cortex-plan-uuid>
# Example: pnpm exec workflow-ralph --plan 77cb14a0-5eb0-4061-87ea-d618b85e8818

# Task-centric: work on a single task by ID (UUID)
pnpm exec workflow-ralph --task <cortex-task-uuid>
# Example: pnpm exec workflow-ralph --task 45a30762-92a9-42f4-90e0-2437c7ef26a8
```

### Debugging Ralph (shim logger)

When Ralph seems stuck (for example while waiting for agent output), turn on the **opt-in shim logger** so one run shows phases, buffer sizes, parse attempts, and parser outcomes. Output goes to **stderr** with a fixed prefix so you can grep or redirect it.

**Enable**

| Mechanism                                                                       | Effect                                                                            |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `WORKFLOW_RALPH_DEBUG=1` (or any truthy value except `0`, `false`, `off`, `no`) | `debug` level: high-signal lines only                                             |
| `WORKFLOW_RALPH_DEBUG=verbose` (or `2`, `all`)                                  | `verbose` level: includes per-chunk / tight-loop detail                           |
| `RALPH_DEBUG=…`                                                                 | Legacy alias for `WORKFLOW_RALPH_DEBUG`                                           |
| `WORKFLOW_RALPH_VERBOSE=1` (or `true`, `yes`, `on`, `verbose`)                  | Forces `verbose` (wins over non-verbose `WORKFLOW_RALPH_DEBUG` when both are set) |
| `pnpm exec workflow-ralph --plan <uuid> --debug`                                | Same as env debug; use `--debug=verbose` for verbose                              |
| `pnpm exec workflow-ralph --plan <uuid> --verbose`                              | Same as `WORKFLOW_RALPH_DEBUG=verbose`                                            |

**Log prefixes**

- `[workflow-ralph:debug]` — every shim line starts with this (stderr).
- `[workflow-ralph:debug] [verbose] …` — extra-noisy path (stream chunks, etc.); only when level is `verbose`.

Implementation: [`src/utils/ralph-debug-logger.ts`](src/utils/ralph-debug-logger.ts). Instrumentation uses the global `ralphDebugLogger` in the Ralph entry flow, [`run-iteration`](src/bin/run-iteration.ts) (cursor-agent spawn/stream), [`child-job`](src/utils/child-job.ts) (nested `workflow-ralph`), [`cortex-ralph`](src/utils/cortex-ralph.ts), and parsers (`parseRalphResponse`, complete-task parsing).

**Reporting a hang**

1. Re-run with debug on: `WORKFLOW_RALPH_DEBUG=1 pnpm exec workflow-ralph --plan <uuid>` or `pnpm exec workflow-ralph --plan <uuid> --debug` (equivalent for this run; CLI overrides env when both are set — see `--help`).
2. Capture **stderr** (shim lines only use stderr; stdout is normal Ralph/agent output). Examples:
   - `… 2>ralph-debug.log` — stderr to a file; stdout still in the terminal.
   - `… 2> >(tee ralph-debug.log)` — watch stderr and save a copy (bash/zsh).
3. Attach `ralph-debug.log` or a full transcript that includes stderr.
4. Note the last `[workflow-ralph:debug]` line — it shows how far parsing / the child process got before the stall.

### Cross-repo usage

Ralph can be invoked from another repo by pointing at this monorepo's workflow binary. **Cortex is required:** set `POSTGRES_URL` or `POSTGRES_*` in the environment (e.g. export from this monorepo's `.env` or a shared config). Ralph injects plan and tasks into the prompt; **do not write a ref file**—the workflow never writes one and invokers rely on planId-in-prompt only. See [docs/cross-repo-usage.md](docs/cross-repo-usage.md) for details.

## Worktree + BullMQ workflow (fan-out/fan-in)

**Queue job payload (`openthrottle-server` plans queue):** `RunPlanJobData` includes optional `ralph` (`RalphNestedRunTuningInput` from `@tools/workflows`): prompt profile, `--backend`, and run tuning (`iterations`, `iteration-timeout`, `model`, `project`, `ralphDebugCli`). When omitted, nested `workflow-ralph` resolves defaults via env and `.workflow-ralph.json` in the worktree cwd (same precedence as manual CLI). The legacy in-process cwd path uses the same argv builder for `job.data.ralph`.

A reusable workflow composes worktree allocation, a pluggable loop, and commit guarantees so you can run any loop (e.g. Ralph) with:

- **Acquire:** Lock an available worktree target and create a branch.
- **Run loop:** Execute your logic in that worktree (e.g. `runChildJob` for Ralph).
- **Ensure commit:** Verify working tree is clean and optionally run lint/test/typecheck before release.
- **Release:** Always release the target so locks are not leaked on loop or ensure-commit failure.

Use `runWorktreeWorkflow` from `@tools/workflows` with a tracker (`WorktreeTargetsTracker` or a Redis-backed implementation), acquire options, a `runLoop(handoff)` async function, and optional `ensureCommit` options. The result reports each step (`acquire`, `loop`, `ensureCommit`, `released`) for retries or alerting. To run Ralph as the loop, pass `runLoop: (handoff) => runChildJob({ handoff, planId, iterations })`. Optional `streamToCortex: true` on `ChildJobInput` appends each stdout/stderr chunk to Cortex `plan_output_stream` (same as MCP `append_plan_output`) for real-time progress; requires Cortex (mcp-developer or openthrottle-server) and Postgres. See `src/utils/workflow.ts` and types in `src/types/worktree.ts` (`WorktreeWorkflowOptions`, `WorktreeWorkflowResult`, `WorkflowLoopResult`). **Process model:** For how processes are spawned (spawnSync for cursor-agent and workflow-ralph), how the workflow composes acquire → runLoop → ensureCommit → release, and where blocking vs streaming/async matters, see [docs/process-model.md](docs/process-model.md). For a proposed evolution (spawn, timeouts, cancellation, streaming), see [docs/process-management-proposal.md](docs/process-management-proposal.md). **Worktree registration and allocation:** For how N worktree targets (or separate repos) are registered, allocated when a job is spawned, and how the spawned process is bound to a repo/worktree, see [docs/worktree-registration-and-allocation.md](docs/worktree-registration-and-allocation.md). **Local API design:** For triggering and managing Ralph runs from a local API (trigger with plan/task/worktree, status, auth, idempotency, concurrency), see [docs/local-api-design.md](docs/local-api-design.md). **Verification and reporting:** For how test/lint/typecheck are part of the spawn lifecycle and how results are reported (job return value, optional Cortex), see [docs/verification-and-reporting.md](docs/verification-and-reporting.md).
