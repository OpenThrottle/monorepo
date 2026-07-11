# Local API/server design: trigger and manage Ralph runs

This document designs an API (REST or internal) that accepts “run Ralph for plan X” (and optional task/worktree), spawns the appropriate process(es), and returns or streams status. It considers auth, idempotency, and concurrency limits. It builds on the existing openthrottle-server GraphQL + BullMQ flow and the process model in [process-model.md](./process-model.md). For how worktree targets are registered, allocated, and bound to spawned jobs, see [worktree-registration-and-allocation.md](./worktree-registration-and-allocation.md).

---

## 1. Current state

- **Trigger:** GraphQL mutation `enqueuePlanRun(input: { planId })` in openthrottle-server (`PlansResolver`). The resolver enqueues a job and returns `{ jobId, planId }`; plan status is set to `QUEUED`.
- **Processing:** BullMQ `plans` queue with concurrency 1. `PlansProcessor` runs either:
  - **Worktree path:** `runWorktreeWorkflow` → acquire target → `runChildJob` (spawns `pnpm exec workflow-ralph --plan <planId>` in worktree) → ensureCommit (lint/test/typecheck) → release.
  - **Legacy (no worktrees):** `spawn` + wait for `pnpm exec workflow-ralph --plan <planId>` in process cwd, with stdout/stderr logged.
- **Job payload:** `RunPlanJobData = { planId: string }`. No `taskId` or `worktreeId` in the API or job data today.
- **Status:** No polling endpoint that returns “run status” for a given job. The UI relies on:
  - Notifications (WebSocket) for “plan updated” / “queue job completed”;
  - OpenThrottle plan status (IN_PROGRESS, COMPLETED, etc.).
- **Auth:** Handled at the GraphQL/HTTP layer (e.g. API key or session); not specific to plan-run.
- **Idempotency:** None. Each `enqueuePlanRun` creates a new job; duplicate calls create duplicate jobs.
- **Concurrency:** Processor concurrency is 1 (single Ralph run at a time). Queue depth can grow unbounded.

---

## 2. Design goals

- **Trigger:** Accept “run Ralph for plan X” with optional **task** (task-centric run) and optional **worktree** (prefer or require a specific target).
- **Spawn:** Keep using the existing workflow (BullMQ + `runWorktreeWorkflow` / `runChildJob`) so spawning remains consistent; optional future REST endpoint that mirrors the same behavior.
- **Return/stream status:** Return job id and, where possible, status (queued → active → completed/failed). Streaming of Ralph stdout/stderr is out of scope for this design (see process-model: requires `spawn` + stream forwarding or side-channel).
- **Auth:** Align with existing API auth; no new auth model required for “run Ralph” itself.
- **Idempotency:** Support optional idempotency so duplicate “run plan X” within a window can return the same job id.
- **Concurrency limits:** Make limits explicit (global and/or per-plan) and configurable.

---

## 3. API surface

### 3.1 Keep and extend GraphQL (recommended)

- **Mutation:** Keep `enqueuePlanRun(input)` and extend the input type:
  - **Required:** `planId: ID`
  - **Optional:** `taskId: ID` (task-centric run; processor would pass `--task` to workflow-ralph when worktree path is used; see §4).
  - **Optional:** `worktreeId: String` (hint or requirement: allocate this worktree if available; requires tracker support to acquire by id).
  - **Optional:** `idempotencyKey: String` (client-provided; see §5).
  - **Optional:** `iterations: Int` (max Ralph iterations; today fixed in processor at 10).
- **Return:** Keep `EnqueuePlanRunResultObject`: `{ jobId, planId }`. Optionally add `status: String` (e.g. `QUEUED`) and/or `position: Int` (queue position) if we add a small queue-stats helper.
- **Status of a run:** Add a **query** (or reuse existing) so the client can ask “what is the status of job J?” or “what is the status of the current/latest run for plan P?”. Options:
  - **Option A:** `job(queueName: "plans", jobId: ID): JobDetails` (already exists in QueuesResolver). Client uses `enqueuePlanRun` → `jobId` → then polls `job("plans", jobId)` for state (waiting, active, completed, failed) and return value if any.
  - **Option B:** `planRunStatus(planId: ID): PlanRunStatus` that returns the latest job id for that plan plus BullMQ job state (if we store planId → jobId mapping or derive from job data). Option A is sufficient if the client keeps the returned `jobId`.

Recommendation: extend the existing mutation input, add optional `taskId`, `worktreeId`, `idempotencyKey`, `iterations`; document that status is available via existing `job(queueName, jobId)` (and notifications). No new mutation name required.

### 3.2 Optional REST mirror

- **POST /api/plans/:planId/run** (or `/api/ralph/run`) with body `{ taskId?, worktreeId?, idempotencyKey?, iterations? }`. Response: `201 { jobId, planId }` and optionally `Location: /api/jobs/:jobId`. Auth same as GraphQL.
- **GET /api/jobs/:jobId** (or use GraphQL `job`): return job state and, when completed, summary (e.g. success/failure, planId). Keeps one place for “run” and one for “status.”

REST is optional; the same behavior can be exposed only via GraphQL.

---

## 4. Spawning and process binding

- **Who spawns:** The BullMQ worker (PlansProcessor) already spawns the workflow. No change: “trigger” = add job to queue; “spawn” = processor runs `runWorktreeWorkflow` (and inside it `runChildJob` spawns `pnpm exec workflow-ralph`).
- **Task-centric run:** Extend `RunPlanJobData` to `{ planId: string; taskId?: string; worktreeId?: string; iterations?: number }`. In `PlansProcessor.processWithWorktree`, when `taskId` is present, call `runChildJob` with a handoff that includes task context; `runChildJob` (or a wrapper in the processor) must invoke `workflow-ralph --task <taskId>` instead of `--plan <planId>` (or in addition, per Ralph CLI semantics). So either:
  - Extend `ChildJobInput` / `runChildJob` to accept optional `taskId` and pass `--task <taskId>` in `ralphArgs`, or
  - Keep `runChildJob` plan-only and have the processor branch: when `taskId` is set, build args as `['exec', 'workflow-ralph', '--task', taskId]` and still use the same handoff/worktree. The latter avoids changing `@tools/workflows` if we only need task-centric in the server.
- **Worktree preference:** If `worktreeId` is provided, pass it as `acquire: { worktreeId, lockedBy }` (see [worktree-registration-and-allocation.md](./worktree-registration-and-allocation.md)). The parent job calls `tracker.acquire({ id: worktreeId, lockedBy })`; if that target is not available, acquire fails (fail-fast). No fallback to "any available" when worktreeId is set.
- **Process binding:** As in process-model.md, the spawned Ralph process is bound to the repo/worktree only by `cwd`. The API does not need to expose PIDs; job id + BullMQ job state are enough for “is this run active?” and “did it complete?”.

---

## 5. Idempotency

- **Goal:** If the client sends the same “run plan X” request twice within a time window (e.g. double-click), the server can return the same job id and not enqueue a second job.
- **Mechanism:** Optional `idempotencyKey` (client-generated, e.g. UUID or `planId + timestamp`). Server stores a mapping `idempotencyKey → jobId` with a TTL (e.g. 24 hours). On `enqueuePlanRun`:
  - If `idempotencyKey` is provided and exists in the store → return existing `jobId` (and `planId`) without adding a new job.
  - Otherwise add the job, store `idempotencyKey → jobId`, return `jobId`.
- **Storage:** Redis (already used by BullMQ) or in-memory for single-instance. Key format e.g. `ralph:idempotency:{idempotencyKey}`.
- **Scope:** Per idempotency key; different keys can still create multiple runs for the same plan.

---

## 6. Concurrency limits

- **Current:** Plans processor has `CONCURRENCY = 1`, so at most one plan run is active at a time. Queue depth is unbounded.
- **Explicit limits to consider:**
  - **Global:** Max concurrent Ralph runs (already 1 if we keep one worker and concurrency 1). Could add a configurable cap and reject new enqueue when “active + waiting” exceeds the cap.
  - **Per-plan:** Optionally “at most one active run per plan” (e.g. if a run for plan P is active, `enqueuePlanRun(P)` either returns the existing job id or fails with “run already in progress”). Implement by checking BullMQ active jobs for same `planId` before adding, or by a small Redis set “active_plan_ids” updated when job starts/finishes.
- **Recommendation:** Document current behavior (concurrency 1, no per-plan limit). Add env or config for “max waiting jobs” (reject enqueue when plans queue waiting count >= N) and, optionally, “single run per plan” as a follow-up.

---

## 7. Verification (test, lint, typecheck) and reporting

- Verification is already part of the spawn lifecycle: `runWorktreeWorkflow` calls `parentJobEnsureCommitBeforeRelease` after the loop, which runs lint/test/typecheck (when `runChecks: true`). No change needed for “when” verification runs.
- **Reporting:** The processor (PlansProcessor) returns the `WorktreeWorkflowResult` from the worktree path so BullMQ stores it as the job's `returnvalue`. The existing `job(queueName, jobId)` query exposes `returnvalue` as a JSON string; clients can parse it to show `acquire`, `loop`, `ensureCommit` (e.g. `ensureCommit.ok`, `ensureCommit.reason`, `ensureCommit.check` when checks failed), and `released`. See [verification-and-reporting.md](./verification-and-reporting.md). Optional: write a short summary to OpenThrottle for "last run verification"; the primary channel is the job return value. (e.g. “Plan run finished” / “checks failed”). To expose verification results to the API:
  - **Option A:** Store the last `WorktreeWorkflowResult` (or a summary) in the BullMQ job’s return value when the job completes. Then `job(queueName, jobId)` can expose `result: { ensureCommit: { ok, reason?, check? } }` so the client can show “lint failed” or “all checks passed.”
  - **Option B:** Write a short summary to OpenThrottle (e.g. append to plan_output or a dedicated field). Option A is simpler and keeps the API as the source of truth for “run status and outcome.”

Recommendation: have the processor set the job’s return value (or progress) to a small result object that includes `acquire`, `loop`, `ensureCommit`, `released` (or a summary), and expose that via the existing job query so the API can report verification results without a new endpoint.

---

## 8. Summary

| Concern          | Recommendation                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Trigger**      | Extend GraphQL `enqueuePlanRun` with optional `taskId`, `worktreeId`, `idempotencyKey`, `iterations`. Optional REST `POST /api/plans/:planId/run` mirror. |
| **Spawn**        | Keep BullMQ + PlansProcessor; extend job data and processor to support task-centric and worktree preference.                                              |
| **Status**       | Use existing `job(queueName, jobId)` (and notifications) for status; optionally store workflow result in job return value for verification outcome.       |
| **Streaming**    | Out of scope for this design; would require process-model changes (spawn + streams or side-channel).                                                      |
| **Auth**         | Reuse existing API auth; no new auth for “run Ralph.”                                                                                                     |
| **Idempotency**  | Optional client `idempotencyKey` with Redis (or in-memory) store and TTL; return existing job id when key is reused.                                      |
| **Concurrency**  | Keep processor concurrency 1; document and optionally add “max waiting” and “single run per plan” later.                                                  |
| **Verification** | Already in lifecycle; report back via job return value exposed by job query.                                                                              |

Implementing this design requires: (1) extending `EnqueuePlanRunInput` and `RunPlanJobData`, (2) updating PlansProcessor to pass task/worktree/iterations and to set job result, (3) optional idempotency in the resolver and Redis, (4) optional REST route that enqueues the same job. No change to the core spawn model in `@tools/workflows` is strictly required for task/worktree options if the processor builds the Ralph args and calls the same `runChildJob`/workflow.
