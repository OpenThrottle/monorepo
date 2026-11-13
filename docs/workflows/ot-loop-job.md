# OT Loop job — contract, worker result file, ownership split

OT plan `8a529290` · status: **design, accepted for implementation** · supersedes `f9c8e688`.

The OT Loop job runs a plan with the per-task discipline of [`skills/ot-loop/SKILL.md`](../../skills/ot-loop/SKILL.md)
headlessly. **The BullMQ job is the ot-loop parent; the agent CLI is the step-2 worker.**
Everything the skill keeps in the parent turn becomes deterministic job code. The worker gets a
standalone prompt built from the task row and reports back through a result file.

> **Lockstep.** [`skills/ot-loop/SKILL.md` § The loop](../../skills/ot-loop/SKILL.md#the-loop-one-task-at-a-time)
> is the canonical statement of the per-task discipline. It is restated deliberately in two other
> places: [`skills/agents-ralph/SKILL.md`](../../skills/agents-ralph/SKILL.md), read by the Ralph
> runner, and this job, which is the **third restatement, in code**. A change to § The loop must
> land here in the same PR. The package entry point carries a comment saying the same.

It runs side by side with Ralph on the same `Plans` queue and is selected per plan. Ralph stays the
default until the end-to-end verification (plan task 10) passes.

---

## 1. Run kind and job identity

| Concern                      | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Queue                        | `Plans` (`PLANS_QUEUE_NAME`), unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| BullMQ job name              | **Unchanged in v1:** both runners enqueue under `RUN_PLAN_ORCHESTRATOR_JOB_NAME` (`'Agentic Ralph'`). Cancel (`cancelPlanRunJobsForPlan` → `isPlanRalphBullJobName`, an allowlist in `queues/plans/plans.utils.ts`), usage-limit resume and the scheduled-run reproject all match or enqueue that one name (`plan-enqueue.service.ts` `enqueuePlanRalphOrchestrator`). A second name would have to be threaded through every one of them, and a missed one means a cancelled OT Loop job that still runs. Queue display labels the runner from the payload instead. Renaming the job (e.g. to a runner-neutral `Plan Run`) is left to the Ralph-retirement follow-up.                                                                 |
| Job payload discriminator    | `RunPlanOrchestratorJobData` gains `runner?: 'ralph' \| 'ot-loop'` plus an `otLoop?: OtLoopRunTuning` block. Absent `runner` means Ralph, so every BullMQ job already persisted in Redis keeps working. Every path that rebuilds job data from a snapshot (`orchestratorJobInputFromSnapshot`, used by scheduled reproject and resume) must carry both keys, or an OT Loop run silently becomes a Ralph run; each gets a round-trip test.                                                                                                                                                                                                                                                                                             |
| `runKind` on the payload     | Stays `'orchestrator'`. `runKind` has only ever meant _in-process vs spawned child_, and the OT Loop job is in-process. Reusing it for "which runner" would conflate two axes. `PlansProcessor.processOrchestrator()` branches on `runner`, not on `runKind`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Branch point                 | `processOrchestrator()` replaces its direct `agenticRalphOrchestrator.runPlanOrchestratorJob(...)` call with a dispatch on `data.runner`, and logs `workflowKind: 'ralph' \| 'ot-loop'` accordingly. The settle branches after it are shared verbatim. The workspace setup now private to `AgenticRalphOrchestratorService` — worktree provisioning + `onWorktreeProvisioned`, checkout registration, the snapshot workspace rewrite, the MCP preflight, foreign-skill injection and config load — is extracted into a shared `PlanRunWorkspaceService` (`services/plan-run-workspace/`) that both runners call, so neither duplicates it. The OT Loop runner skips the MCP preflight and skill injection (its worker uses neither).  |
| `plan_runs.run_kind`         | Stays `'orchestrator'` (the CHECK in migration 038 allows `spawn`/`orchestrator`). **No migration.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Where the runner is recorded | `plan_runs.run_config_snapshot` gains an additive top-level `runner` key (`'ralph' \| 'ot-loop'`, absent = Ralph) and the `otLoop` tuning block, written at enqueue by the existing snapshot builder (`enqueue-plan-run-config-snapshot.utils.ts`). That is enough: the runner is only read to label and filter runs, and JSONB answers `run_config_snapshot->>'runner' = 'ot-loop'`. A dedicated column would be justified only if a hot query filters on it, and none does.                                                                                                                                                                                                                                                         |
| Plan config                  | `runConfigJson` gains a top-level `runner` and an `otLoop` sibling of `ralph`. **Not free:** the storage and snapshot Zod schemas in `packages/openthrottle-plan-config` are `.strict()`, so `plans.resolver.ts` and `plan-creation.service.ts` would reject the new keys today. The schemas, their types, the developer UI mirror (`plan-run-config-ui.ts`) and the snapshot round-trip all change, each with a test — a dedicated plan task. Ralph-only fields under `ralph` (`prompt`, `promptLayer`, `iterations`) are ignored by the OT Loop runner. The shared fields (`executionBackend`, `model`, `effort`, worktree settings, `debugCli`) are read from `ralph` for both runners in v1 so no plan config has to be migrated. |
| Outcome type                 | The job returns the existing `WorkflowRunResult` from `@openthrottle/openthrottle-agentic-ralph` (`finished` with optional `headSha`/`prNumber`, `workflow_usage_limited`, or `failed`). That reuses **every** settle branch in `processOrchestrator` (FAILED, CANCELLED, USAGE_LIMITED + resume, COMPLETED with ledger artifacts, afterAll hooks, worktree cleanup) without duplicating one.                                                                                                                                                                                                                                                                                                                                         |

`OtLoopRunTuning` (v1):

```ts
interface OtLoopRunTuning {
  /** Shell commands run in order after each worker attempt. Overrides repo config. */
  readonly validationCommands: readonly string[] | undefined;
  /** Worker re-invocations after a red validation. Default 2, clamped 0..5. */
  readonly maxRetries: number | undefined;
  /** Run once per run, before the first task (e.g. codegen in a fresh worktree). Overrides repo config. */
  readonly setupCommands: readonly string[] | undefined;
  /** Whole-plan validation before finalize. Overrides repo config. */
  readonly finalValidationCommands: readonly string[] | undefined;
}
```

**Task-centric runs** (`mode: 'task'`, `taskId`) are supported: selection is restricted to that one
task, the loop ends after it, and finalize runs as for a plan.

**Package.** The pure loop lives in a new package, `@openthrottle/openthrottle-agentic-loop`
(`packages/openthrottle-agentic-loop`), scaffolded by `@tools/generators` and shaped like
`openthrottle-agentic-ralph` (server-consumed, so it follows that package's `exports` shape). The
NestJS wiring lives in `applications/openthrottle-server/src/queues/ot-loop/`
(`OtLoopOrchestratorService`), next to `queues/agentic-ralph/`.

---

## 2. Ownership — job code vs worker

Every row of the skill's [What delegates, and what never does](../../skills/ot-loop/SKILL.md#what-delegates-and-what-never-does)
table, mapped:

| Skill row (stays in the parent)     | Owner here          | Where                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task selection and ordering         | **Job**             | Loop package: lowest-`sortOrder` `IN_PROGRESS`, else lowest `PENDING`/`QUEUED`; ties by `createdAt`. Re-read from OT at every boundary, never cached.                                                                                                                                                                                                                                                     |
| The status flips (steps 1 and 4)    | **Job**             | `updateTask` via GraphQL. Step 1 asserts no other task is `IN_PROGRESS` first; if one is, it is resumed instead. That task may have been left by a crashed predecessor, a human, a Ralph run or an interactive loop, so the job logs what it found (latest work session's model and age) before resuming it.                                                                                              |
| Session open / `begin_task_session` | **Job**             | Each task gets its **own** work-session row: `startWorkSession({ model })` → `attachWorkSessionSubject({ planId, taskId })`, and at the next boundary `endWorkSession` on **that task session only**. The processor's run session (`openRalphSession`, closed in its `finally`, carried as `X-OT-Session-Id`) is never ended by the job. `model` is the routed model actually passed to the driver (§ 8). |
| Validation (step 3)                 | **Job**             | § 6. Sequential, never skipped. The worker _may_ run checks for its own feedback (§ 3); only the job's run decides the task.                                                                                                                                                                                                                                                                              |
| The commit (step 5)                 | **Job**             | Commit with the result file's `commitMessage` (commitlint-checked) plus `Plan-Id:`/`Task-Id:` footers; no commit when nothing tracked changed. Husky hooks run.                                                                                                                                                                                                                                           |
| `append_plan_output` narration      | **Job**             | Per-task start/finish lines, validation summaries and the streamed worker + validation output, all tagged with `taskId`.                                                                                                                                                                                                                                                                                  |
| The cancel poll and inbox claim     | **Job**             | § 9.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Settling the run row                | **Job (processor)** | The job returns a `WorkflowRunResult`; `PlansProcessor` settles exactly as it does for Ralph.                                                                                                                                                                                                                                                                                                             |
| **The work of step 2**              | **Worker**          | One `runDriverAsync` invocation per attempt, in the run's worktree, with the § 3 prompt.                                                                                                                                                                                                                                                                                                                  |

Steps the skill does outside the table, also job-owned: plan `IN_PROGRESS` (already done by the
processor's `promoteParentPlanToInProgress`), follow-up tasks (step 6, from the result file), the
three-way close, squash onto the fetched merge-base, the single push and the draft PR, and per-task
model routing.

**Guards against a worker that ignores its prompt.** The prompt says "do not change OT status, do
not commit", but a CLI that loads the repo's MCP config could still reach OT — and a worker that
completes the last open task auto-closes the plan `COMPLETED`, which the server never reconciles
downward. So the guard is two layers:

1. **Prevention.** The worker's env drops the OT credentials the MCP authenticates with (the
   `OPENTHROTTLE_*` token variables), so an OT MCP call from the worker fails auth instead of
   writing.
2. **Detection**, after every attempt, deterministically:
   - **Branch changed, or HEAD moved** → the worker switched branches or committed. The job checks
     out the run's branch and `git reset --soft <taskStartSha>` (keeps the changes, drops the
     commits), and logs a warning.
   - **Task or plan status changed** → the job restores the task to `IN_PROGRESS` and the plan to
     `IN_PROGRESS`, and logs a warning. Other tasks' statuses are compared against the boundary
     snapshot; a change is logged, not reverted (a human may have made it).

---

## 3. Worker prompt

Built from the task row only, plus the job's own operating instructions. No slash command, no MCP
instruction, no skill reference, so it works on every registered driver (claude, codex, cursor,
gemini, opencode, grok, antigravity). Derived from the skill's
[The delegation prompt must stand alone](../../skills/ot-loop/SKILL.md#the-delegation-prompt-must-stand-alone).

```text
You are working one task from a plan, inside a git worktree at the repository root.

# Task
<task.title>

<task.description, verbatim>

# Acceptance criteria
- <requirementsJson[0]>
- <requirementsJson[1]>
...
(omitted entirely when requirementsJson is empty)

# Operator guidance
<STEER and QUEUE message bodies claimed at this boundary, verbatim, oldest first>
(omitted when there are none)

# Previous attempt failed validation
Command: <command>
Exit code: <n>
Last <k> lines of output:
<tail>
(present only on a retry; see § 6)

# Repository rules
Follow the repository's own AGENTS.md / CLAUDE.md / CONTRIBUTING.md. In particular, where they
apply: use the repo's generators before hand-writing files; no `as` casts or `any`; no deep package
imports; `import type` at the top level. You may run the project's checks for your own feedback,
one at a time.

# Hard rules
- Do NOT change any plan or task status in any tracker, and do NOT commit, push, or open a PR.
  The caller owns all of that.
- Do NOT edit files under .ot-loop/ other than the result file below.

# When you finish, write .ot-loop/result.json
<the § 5 schema, inlined as a JSON example with field notes>
Write it last. If you cannot finish, write status "blocked" with the reason.
```

The repo rules paragraph is the generic form of the skill's line. A repository can extend it later
through the same config file as validation (§ 6); not needed for v1.

---

## 4. Thin tasks

The skill does a too-thin task in the parent. The job has no judgment to do that with, so:

**Rule:** a task whose trimmed `title` + `description` together are shorter than **60 characters**
_and_ whose `requirementsJson` is empty is set `BLOCKED` with summary `task row too thin to delegate: add a
description or acceptance criteria`, without invoking the worker. The loop then continues to the
next task. The thresholds are constants in the loop package.

---

## 5. Result file

**Path:** `<worktree root>/.ot-loop/result.json`.

Before the first attempt the job creates `.ot-loop/` containing a `.gitignore` of `*` — the same
self-ignoring trick as `.ot-pr-draft` (`preparePlanRunPrDraftDir`) — so nothing inside it can ever
be staged, in any repo, without editing the repo's own `.gitignore`. Before **every** attempt the job
deletes any existing `result.json`, so a stale file from an earlier attempt can never be read as
this one's. After reading, the job deletes it again. The commit step additionally asserts that no
staged path starts with `.ot-loop/`.

### Schema (version 1)

```json
{
  "version": 1,
  "status": "done",
  "reason": "Implemented the parser and its tests.",
  "commitMessage": "feat(openthrottle-agentic-loop): parse the worker result file",
  "followUps": [
    {
      "title": "Stream validation output in 4 KB batches",
      "description": "plan_output receives one row per chunk; batch it.",
      "category": "implementation"
    }
  ]
}
```

| Field           | Type                               | Required          | Meaning                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`       | `1`                                | yes               | Schema version. Any other value is malformed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `status`        | `"done" \| "blocked" \| "skipped"` | yes               | `done`: the worker believes the task is finished — the job still validates. `blocked`: the worker cannot finish; the task goes `BLOCKED` without validation or retry. `skipped`: honoured **only** when this attempt's prompt carried operator guidance (§ 9); otherwise treated as `blocked`.                                                                                                                                                                                                                    |
| `reason`        | string, 1–2000 chars after trim    | yes               | One-paragraph summary. Becomes the task `summary` and the plan-output line.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `commitMessage` | string \| null                     | yes (may be null) | A conventional-commit message (header, optional body). No `Plan-Id:`/`Task-Id:` footers — the job adds them — and no attribution trailers. Checked by § 7.                                                                                                                                                                                                                                                                                                                                                        |
| `followUps`     | array, max 10                      | yes (may be `[]`) | Work the task revealed. Each item: `title` (string, 1–200), `description` (string, ≤ 4000), `category` (string \| null). Created with `createTasks` **after** the commit succeeds and **before** the task's `COMPLETED` flip (the last-open-task auto-close gotcha), appended after the plan's max `sortOrder`. On a `blocked` result they are still created, as `PENDING` tasks — they are what a human needs to unblock it. On a failed attempt (retried) they are discarded, so retries cannot duplicate them. |

Unknown extra keys are ignored (forward compatibility); the JSON must be an object.

### Failure semantics

The parser returns a discriminated union, never throws:

```ts
type WorkerResultRead =
  | { readonly kind: 'ok'; readonly result: WorkerResult }
  | { readonly kind: 'missing' }
  | { readonly kind: 'malformed'; readonly error: string };
```

- **`missing`** or **`malformed`** — a failed attempt. It consumes one retry; the retry prompt's
  "Previous attempt failed" section says the result file was missing or names the schema error.
  After the last retry the task goes `BLOCKED` with `worker did not produce a valid result file:
<error>`.
- A worker process that exits non-zero, times out, or returns the driver's `<promise>ERROR</promise>`
  sentinel is treated the same way, with the driver's tail as the failure text — **except** that the
  job checks `signal.aborted` first: an aborted attempt is a cancel (§ 9), never a failed attempt.
- **`blocked`** — no validation, no retry: the task goes `BLOCKED` with `reason`.

### Uncommitted work on a task that does not complete

A task that ends `BLOCKED` (or is cancelled, § 9) may leave changes in the worktree that must not
leak into the next task's commit. The job saves them as `.ot-loop/patches/<taskId>.patch`
(`git diff --binary <taskStartSha>` including untracked files, via `git add -N` first) and posts
the patch's `--stat` summary to plan output. The file lives only inside the worktree, which teardown
or the reaper eventually deletes, so the plan-output summary is the durable record; a worktree that
ends with a BLOCKED task is kept by the existing cleanup policy. It then restores the worktree to `taskStartSha` (`git reset --hard` + `git clean -fd`,
which never touches ignored paths, so `.ot-loop/` survives). This only ever runs inside the run's
own provisioned worktree. A run that opted out of a worktree (`ralph.worktree` absent, the
`disableWorktree` discriminator — not `skipWorktreeSetup`, which is stripped) is **rejected at
enqueue** for the OT Loop runner rather than resetting a human's checkout (see § 6 on why rejection
happens at enqueue).

---

## 6. Validation policy

**Resolution order** (first hit wins):

1. `runConfigJson.otLoop.validationCommands` on the plan (per plan override).
2. `.openthrottle/ot-loop.json` committed in the target repository — `{ "validation": { "commands": [...] } }` (per repository; works for foreign, non-Nx repos with no server schema).
3. **Nx default** when the worktree has an `nx.json`: three commands, in order —
   `pnpm nx affected -t lint --base={taskStartSha} --parallel=1`, then `typecheck`, then `test`.
   `--base` alone makes Nx include committed, uncommitted and untracked changes since the task
   started, which is exactly this task's scope. The package manager prefix comes from the repo's
   lockfile (`pnpm-lock.yaml` → `pnpm`, `package-lock.json` → `npx`, `yarn.lock` → `yarn`).
4. **None** → the enqueue is rejected with
   `OT Loop needs a validation command: set otLoop.validationCommands on the plan or add .openthrottle/ot-loop.json`.
   The runner never marks a task done without validation, so it refuses to run rather than skip it.

**Where it is checked.** Resolution runs at **enqueue** in `plan-enqueue.service` (against the base
checkout, which has the same committed `.openthrottle/ot-loop.json`) and rejects there. By the time
the job runs, `process()` has already moved the plan to `IN_PROGRESS`, and the processor's `failed`
branch does not reset it, so a run-time rejection would strand the plan. The job re-resolves at start
(the worktree is authoritative) and, if it still finds nothing, returns `failed` /
`workflow_input_required`; for this runner the processor's failed branch also returns the plan to
the status it had before the run.

The same file carries `setup.commands` (run once per run before the first task — e.g. this
monorepo's `pnpm nx run-many --target=codegen-graphql --all`, without which a fresh worktree's tests
cannot collect) and `finalValidation.commands` (whole-plan validation before finalize, the skill's
Finishing step 2). There is no Nx default for either: this repository commits its own
`.openthrottle/ot-loop.json`. A red setup command fails the run (same stranding rule: plan status
restored). A red final validation creates a `BLOCKED` task _Final validation failed_ carrying the
tail, so the three-way close ends the plan `BLOCKED` and the PR stays draft.

`{taskStartSha}` is the only placeholder, substituted shell-escaped.

`resolveOtLoopCommands` (in `openthrottle-agentic-loop`) returns `resolved`, `none` or `invalid`. A
malformed `.openthrottle/ot-loop.json` (or empty `validation.commands`) is `invalid` with a message
naming the problem, not a throw, and the plan override does not mask it because `setup` and
`finalValidation` always come from the file. With no lockfile the Nx default uses `npx`. A command
killed by its timeout is red with exit code 124.

**Execution.** Commands run strictly one after another in the worktree, never concurrently with each
other or with the worker (shared `.nx` cache). The first non-zero exit stops the sequence: the
attempt is red. Each command has a timeout (default 30 min, `OtLoopRunTuning` can lower it later)
and receives the run's abort signal. Output streams to plan output tagged with `taskId`.

**Retries.** `maxRetries` default **2** (three attempts in all), clamped to 0–5. On red the worker is
re-invoked with the "Previous attempt failed validation" section carrying the failing command, its
exit code and the **last 200 lines, capped at 16 KB**, ANSI codes stripped. After the last red
attempt the task goes `BLOCKED` with summary `validation failed after <n> attempts: <command> exited
<code>` and the tail is appended to plan output. The run continues with the next task; the plan ends
`BLOCKED` by the three-way close.

---

## 7. Commit policy (summary — implemented in plan task 5)

- Message: the result file's `commitMessage`. It is checked with the repo's commitlint when the repo
  has a commitlint config (`pnpm exec commitlint` on a temp file); a repo without one accepts any
  non-empty header. Attribution trailers are stripped by the repo's own `commit-msg` hook anyway.
- Missing or rejected message: fall back to `<type>: <task title>` with `type` from the task
  category (`implementation`→`feat`, `documentation`/`docs`→`docs`, `test`/`testing`→`test`,
  `refactor`→`refactor`, else `chore`). The subject is lower-cased on its first character (so
  `config-conventional`'s `subject-case` accepts it) and the header capped at 100 characters.
- **Commit failures have their own budget.** If commitlint rejects the fallback too (e.g. a required
  scope), or a pre-commit hook (lint-staged, the folder-vocabulary or component-shape gates) rejects
  the commit, the hook/commitlint output goes back to the worker as a fix-up attempt — **one** such
  attempt per task, not drawn from `maxRetries`, followed by a full re-validation. A second commit
  failure ends the task `BLOCKED` with the hook output.
- Order per task: commit → create follow-ups → flip `COMPLETED`. A failed commit therefore can never
  leave follow-ups behind for a task that did not complete.
- Footers `Plan-Id: <planId>` and `Task-Id: <taskId>` appended by the job. Hooks run; never
  `--no-verify`.
- Finish: fetch `origin/<base>`, squash onto the **merge-base** with the freshly fetched ref, verify
  the squash diff only touches files this branch's commits touched (the #590 guard), push once,
  open a **draft** PR.
- **Re-runs on an already-pushed branch.** Finalize pushes without force. When `origin/<branch>`
  already exists (a BLOCKED run was re-enqueued on its kept worktree), the job does **not** re-squash
  the pushed history; it squashes only the commits made after `origin/<branch>` into one and pushes
  that as a fast-forward. Force-pushing needs a human, so the runner never does it.
- `finalizePlanRun` is reused for push/PR/`.ot-pr-draft`, with a **new explicit parameter**:
  today `markReady` is derived as `!DRAFT_ONLY_REASONS.has(priorReason)`, so `workflow_complete`
  (and the `handoff_owed` retry) runs `gh pr ready`. Plan task 5 adds `markReady: boolean` to
  `FinalizePlanRunParams` (Ralph passes today's derived value, unchanged); this runner always passes
  `false`. The prior reason stays truthful: every task resolved → `workflow_complete`; any task
  `BLOCKED` → `workflow_tasks_blocked`. Its `workflow_complete_handoff_owed` behaviour on a failed
  push/PR step is kept.

---

## 8. Model routing (summary — implemented in plan task 6)

One driver per run (`ralph.executionBackend`). Model per task from
`skills/ot-loop/references/model-routing.json`: `lower(category)` → tier → model, miss or blank →
`default`; no category reaches `review`. If the tier's model is not valid for the run's driver
(`discoverModels`), the run's configured model is used instead. Whatever is passed to the driver is
exactly what `startWorkSession({ model })` records.

---

## 9. Cancel, inbox, heartbeat, usage limits

| Primitive               | Existing owner                                                                               | Where it fires in the loop                                                                                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Heartbeat               | `PlansProcessor.startRunHeartbeat` (15 s timer)                                              | Unchanged. Independent of task progress, so a long worker attempt never looks stale.                                                                                                                                                   |
| Cancel — signal         | `PlanRunCancellationService.attach(planId)` + `CancelChannelService` pub/sub → `AbortSignal` | Passed to `runDriverAsync({ signal })` and to every validation command, so a Kill interrupts mid-attempt.                                                                                                                              |
| Cancel — durable marker | `plan_runs.cancel_requested_at`, read via `planRunsService.readCancelRequested(planId)`      | Polled at **every task boundary** (before selecting the next task) **and between attempts** of one task, covering a missed pub/sub message.                                                                                            |
| Inbox                   | `claimPlanMessages({ planId, planRunId, taskId })` GraphQL mutation                          | At every task boundary, **after** a clear cancel poll and **before** step 1 of the selected task, once — and again **between attempts** of one task, after the cancel poll, so guidance posted while an attempt ran reaches the retry. |

**On cancel** the job stops at once: a running worker or validation is killed through the signal,
the current task's changes are saved as a patch (§ 5), the task returns to `PENDING` (it was not
done, so `BLOCKED` would lie), and the job returns `{ reason: 'workflow_cancelled' }`. The processor
settles the row `CANCELLED`. No task is left `IN_PROGRESS`.

**Inbox messages — a deliberate Lockstep exception.** The skill has the parent interpret each
message ("skip the UI task" → that task `SKIPPED`; "stop after this one" → finish, then `CANCELLED`;
a `QUEUE` for a later task → a `create_tasks` entry). The job cannot interpret free text, so it
diverges, explicitly:

- Every claimed `STEER` and `QUEUE` body is acknowledged in plan output with the `taskId` and kept
  in a run-scoped **guidance list**. Because claiming is delivery, nothing may be dropped: the whole
  list is placed verbatim in **every** subsequent task's prompt under "Operator guidance" (STEERs
  first, then QUEUEs, oldest first) for the rest of the run, so a message meant for a later task
  still reaches it.
- The worker may answer guidance like "skip the UI task" with `status: "skipped"`, which the job
  honours only for an attempt whose prompt carried guidance.
- **Mid-attempt delivery is not possible here.** The job only regains control between attempts, so
  a message posted while the worker CLI runs waits for the retry or the next boundary. Reaching
  the worker itself mid-attempt needs a hook inside the spawned CLI that knows its run; the bundled
  `plan-inbox-claim` hook finds the run from an interactive transcript's `register_plan_run`, which
  a headless worker never calls. Follow-up: OT plan `124a5d6c`.
- "Stop after this one" is **not** honoured by the job; the UI's message composer says so and points
  at **Cancel**, which is.

**Usage limits.** `runDriverAsync`'s `onUsageLimit` marks the attempt limited. The job kills nothing
further, keeps the worktree as is (no patch, no reset), returns the current task to `PENDING`, and
returns `WorkflowUsageLimitedResult`. The processor's existing `UsageLimitResumeService` schedules
the continuation; teardown is skipped for `workflow_usage_limited` and provisioning reuses the
worktree by name, so the continuation resumes in the same worktree. **Limitation:** today
`onUsageLimit` fires only for drivers whose `parseOutput` reports a limit (Claude), and only on a
normal close. On other drivers a usage limit looks like a failed attempt: it burns retries and can
end the task `BLOCKED` with the driver's message as the reason. A human re-enqueues. Detecting limits
for more drivers belongs in each driver's `parseOutput`, not in this job.

**Lifecycle hooks.** `beforeAll`/`afterAll` stay with the processor, unchanged. Ralph's
per-iteration lifecycle events are not emitted by this runner in v1; that is a known gap, not a
silent difference, and is listed in the run's plan output on start.

---

## 10. Output streaming

Unlike the Ralph orchestrator path, which has no `onChunk`, the job passes `onChunk` to
`runDriverAsync` and to every validation command, and forwards it to `PlanOutputStreamService`
tagged with `taskId`. Chunks are batched (flush at 4 KB or 2 s) so a chatty CLI does not write a row
per line.

---

## 11. Schema and migration needs

**No database migration.** The runner is carried in the BullMQ payload and in
`run_config_snapshot`; `run_kind` keeps its in-process meaning; no new driver widens migration 079's
`execution_backend` CHECK.

**Schema work that is needed** (added to the plan as its own task, before the queue wiring):
the strict Zod schemas in `packages/openthrottle-plan-config` (storage and snapshot), their types,
`plan-run-config-ui.ts`, and the snapshot → job-input round-trip (`orchestratorJobInputFromSnapshot`)
must accept and carry `runner` and `otLoop`. The GraphQL enqueue input gains an additive optional
runner field (plan task 7).

---

## 12. Review record

Reviewed with opus-4.8 (2026-11-09) before implementation, against the code. All 16 findings were
resolved in this doc:

| #   | Severity   | Finding                                                                                                                                    | Resolution                                                                    |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 1   | blocker    | A new `OT Loop` job name is invisible to cancel (`isPlanRalphBullJobName` allowlist), and resume/reproject re-enqueue under the Ralph name | § 1: one job name for both runners, dispatch on `payload.runner`              |
| 2   | blocker    | Plan-config and snapshot Zod schemas are `.strict()`; reproject drops unknown keys                                                         | § 1, § 11: schema task added to the plan; round-trip tests required           |
| 3   | blocker    | `finalizePlanRun` has no "never ready" mode                                                                                                | § 7: new explicit `markReady` param; truthful reason mapping                  |
| 4   | should-fix | Re-squashing an already-pushed branch makes every re-run non-fast-forward                                                                  | § 7: squash only commits after `origin/<branch>`                              |
| 5   | should-fix | Workspace setup is private to the Ralph service                                                                                            | § 1: extract `PlanRunWorkspaceService`; branch point named                    |
| 6   | should-fix | Wrong opt-out discriminator                                                                                                                | § 5: `ralph.worktree` absent                                                  |
| 7   | should-fix | A start-time failure strands the plan `IN_PROGRESS`                                                                                        | § 6: reject at enqueue; failed branch restores plan status                    |
| 8   | should-fix | A worker with OT MCP can auto-close the plan                                                                                               | § 2: strip OT credentials from worker env; restore plan status; check branch  |
| 9   | should-fix | Ending "the" session could end the processor's run session                                                                                 | § 2: separate per-task session rows                                           |
| 10  | should-fix | Usage limits only detected for Claude; an abort looks like an error                                                                        | § 5, § 9: abort check first; limitation documented                            |
| 11  | should-fix | Inbox handling departs from the skill and loses later-task guidance                                                                        | § 9: run-scoped guidance list carried forward; marked as a Lockstep exception |
| 12  | should-fix | Fallback commit fails `subject-case`; hook failures unhandled; follow-up duplication                                                       | § 7: lower-case, separate commit-fix budget, commit → follow-ups → COMPLETED  |
| 13  | should-fix | No setup (codegen) or whole-plan validation                                                                                                | § 6: `setup` and `finalValidation` commands; red final → BLOCKED task         |
| 14  | nit        | Patches non-binary and ephemeral                                                                                                           | § 5: `--binary`, stat summary to plan output                                  |
| 15  | nit        | Resume claim about who holds `IN_PROGRESS` was false                                                                                       | § 2: log the prior holder                                                     |
| 16  | nit        | `mode: 'task'`, title in thin rule, follow-ups on BLOCKED                                                                                  | § 1, § 4, § 5                                                                 |

The reviewer confirmed `nx affected --base=<sha>` unions the committed diff since that sha with
uncommitted and untracked files.
