# Verification (test, lint, typecheck) in the spawn lifecycle

This document describes how verification (lint, typecheck) is integrated with spawned Ralph jobs, where it runs in the workflow, and how results are reported back to the API or OpenThrottle.

---

## 1. Integration with spawned jobs

Verification is **part of the same spawn lifecycle** as the Ralph loop; it is **not** a separate step that the API triggers with a second request.

- **Single flow:** When the API (or BullMQ processor) runs a Ralph job, it calls `runWorktreeWorkflow` once. That workflow: acquire → run loop (e.g. `runChildJob` spawning `pnpm exec workflow-ralph`) → **ensure commit** (clean check + optional lint/typecheck) → release. Verification runs **inside** this flow, after the loop succeeds and before the worktree is released.
- **No separate API step:** The API does not "trigger verification" as a separate call. The processor passes `ensureCommit` options into `runWorktreeWorkflow`; verification runs automatically when the loop completes. Results are part of the same job’s return value.
- **Configuration:** The caller passes `WorktreeWorkflowOptions.ensureCommit` (`ParentJobEnsureCommitOptions`): `runChecks` (default `true`) to enable or disable lint/typecheck, optional `base` for nx affected, and optionally `timeoutMs`, `signal` (AbortSignal), and `onChunk` for progress/cancel during nx checks (spawn + Promise). The spawned job is bound to one worktree; all verification runs in that worktree’s `cwd`.

So: **verification is integrated with spawned jobs** by being a step inside `runWorktreeWorkflow`; the API exposes results by returning the workflow result (including `ensureCommit`) as the job’s return value (see §4).

---

## 2. Where verification runs

Verification is part of the **worktree workflow** in `runWorktreeWorkflow` (`src/utils/workflow.ts`):

1. **Acquire** — Lock a worktree target and create a branch.
2. **Run loop** — Execute the child job (e.g. `pnpm exec workflow-ralph --plan <planId>` in the worktree).
3. **Ensure commit** — Only when the loop succeeded: ensure working tree is clean and (optionally) run lint and typecheck (same nx targets as CI).
4. **Release** — Always release the target if acquire succeeded.

The ensure-commit step is implemented in `parentJobEnsureCommitBeforeRelease` (`src/utils/parent-job.ts`):

- **Clean check:** `git status --porcelain`; if the worktree has uncommitted changes, the step fails with `reason: 'working_tree_dirty'` and no checks run.
- **Checks (when `runChecks: true`, default):** Run in order via `pnpm exec nx` (spawn + Promise; optional timeout and AbortSignal), aligned with `.github/workflows/continuous-integration.yml`:
  - `lint` (either `nx affected -t lint --base <base> --parallel` or `nx run-many -t lint --parallel`)
  - `typecheck`
- If any check fails, the step returns immediately with `reason: 'checks_failed'` and the failing `check` name. On timeout or abort (signal), the step returns `reason: 'checks_timed_out'` or `reason: 'checks_cancelled'` with optional stderr/stdout. No separate step is run for verification; it is part of the same spawn lifecycle as the Ralph loop.

---

## 3. Result shape

The ensure-commit result is typed as `ParentJobEnsureCommitResult` (`src/types/worktree.ts`):

- **Success:** `{ ok: true }`
- **Dirty worktree:** `{ ok: false, reason: 'working_tree_dirty', detail?: string }`
- **Check failed:** `{ ok: false, reason: 'checks_failed', check: 'lint' | 'typecheck', stderr?: string, stdout?: string }`
- **Checks timed out:** `{ ok: false, reason: 'checks_timed_out', stderr?: string, stdout?: string }`
- **Checks cancelled:** `{ ok: false, reason: 'checks_cancelled', stderr?: string, stdout?: string }`

The full workflow returns `WorktreeWorkflowResult`, which includes:

- `acquire` — whether the target was acquired
- `loop` — result of the child job (Ralph)
- `ensureCommit` — present only when acquire and loop succeeded; the verification result above
- `released` — whether the target was released

So verification results are already part of the workflow return value; they are not a separate API step.

---

## 4. Reporting results back

### 4.1 Via the API (job return value)

When the BullMQ processor (e.g. `PlansProcessor` in openthrottle-server) runs `runWorktreeWorkflow`, it can **return** the `WorktreeWorkflowResult` from the job handler. BullMQ stores that as the job’s `returnvalue`. The existing job query (e.g. `job(queueName: "plans", jobId)`) exposes `returnvalue` as a JSON string. Clients can parse it to show:

- Whether the run completed (`released`, `loop.ok`)
- Whether verification passed (`ensureCommit?.ok`)
- On failure: `ensureCommit.reason`; for `checks_failed`, `ensureCommit.check`; for `checks_timed_out` / `checks_cancelled`, optional `ensureCommit.stderr` / `ensureCommit.stdout`

No new endpoint is required; the same job query returns verification outcome when the processor sets the job return value to the workflow result (or a summary that includes `ensureCommit`). For spawned jobs, this is the **primary** channel: the processor returns `WorktreeWorkflowResult` from the job handler so the API can expose verification status via the existing job query.

### 4.2 Via OpenThrottle (optional)

Verification results can optionally be written to OpenThrottle (e.g. append to plan output or a dedicated field) so that “last run verification” is queryable from the plans knowledge base. That would require the processor (or a post-job hook) to call OpenThrottle (e.g. `append_plan_output` or an update to a plan/run summary). This is optional; the primary recommendation is to report via the job return value and existing job query.

---

## 5. Summary

| Aspect                       | Detail                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **When**                     | After the Ralph loop succeeds, inside `runWorktreeWorkflow`, before release.                |
| **What runs**                | Working tree clean check; then (if `runChecks: true`) lint → typecheck via nx (CI-aligned). |
| **Result**                   | `WorktreeWorkflowResult.ensureCommit` (`ParentJobEnsureCommitResult`).                      |
| **Reporting (API)**          | Processor returns workflow result; job `returnvalue` exposes it; client parses JSON.        |
| **Reporting (OpenThrottle)** | Optional: append to plan output or store run summary.                                       |

See also: [process-model.md](./process-model.md) (lifecycle and blocking behavior), [local-api-design.md](./local-api-design.md) §7 (verification and reporting).
