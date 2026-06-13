# Process management proposal: async spawn, timeouts, cancellation, streaming

This document proposes how to evolve Ralph workflow process management so a local API/server can trigger runs, observe progress, enforce timeouts, and cancel runs. It builds on [process-model.md](./process-model.md) and aligns with [local-api-design.md](./local-api-design.md) and [verification-and-reporting.md](./verification-and-reporting.md).

---

## 1. Recommendation: spawn vs spawnSync

| Call site                     | Current     | Proposed                         | Rationale                                                                      |
| ----------------------------- | ----------- | -------------------------------- | ------------------------------------------------------------------------------ |
| **child-job.ts** (Ralph)      | `spawnSync` | **`spawn`** + Promise            | Long-running; need streaming, timeout, cancel.                                 |
| **ralph.ts** (cursor-agent)   | `spawnSync` | **`spawn`** + Promise (optional) | Enables streaming and per-iteration timeout; CLI can stay sync for simplicity. |
| **parent-job.ts** (git)       | `spawnSync` | **Keep `spawnSync`**             | Short, fast calls; no need for streaming or cancel.                            |
| **parent-job.ts** (nx checks) | `spawnSync` | **`spawn`** + Promise (optional) | Long-running; enables progress and cancel.                                     |

- **Default path:** Migrate **child-job** to `spawn` first so the coordinator (BullMQ worker) can stream output and support timeout/cancel. That gives the API immediate value without changing the CLI.
- **ralph.ts:** Can stay `spawnSync` when run interactively; when run as a child of child-job, the parent (child-job) is the one that benefits from async spawn. Optionally migrate ralph.ts to `spawn` for cursor-agent so the CLI can stream or respect a per-iteration timeout.
- **Short git commands:** Keep `spawnSync`; they are fast and blocking is acceptable.

---

## 2. Workers and concurrency

- **No new worker type:** Keep using the existing BullMQ worker process as the process that runs `runWorktreeWorkflow`. No separate “Ralph worker” process is required.
- **One workflow per job:** Each job still runs one workflow (acquire → runLoop → ensureCommit → release). The improvement is that inside the loop, `runChildJob` uses `spawn` so the Node process does not block; it can handle stream data, timeouts, and abort signals.
- **Concurrency:** Concurrency is already handled by BullMQ (N jobs → N workers, or one worker processing jobs sequentially). Moving to `spawn` does not change that; it only makes the run non-blocking so the worker can process stream chunks and respond to cancel/timeout.

---

## 3. Timeouts

- **Per-run timeout:** Add an optional timeout (e.g. seconds) to the child job input (or workflow options). When using `spawn`, start a timer; on expiry, call `child.kill('SIGTERM')` (or `SIGKILL` after a short grace period).
- **AbortSignal:** Accept an optional `AbortSignal` in the child job (or runLoop) so the caller can cancel externally. When the signal aborts, kill the spawned process the same way as timeout.
- **Scope:** Timeout applies to the Ralph run (the `pnpm exec workflow-ralph` process). Optionally, a separate timeout can apply to ensureCommit (nx checks); same pattern (spawn + timer + kill).

---

## 4. Cancellation

- **Track PID:** When child-job (or parent-job for nx) uses `spawn`, store the child process reference (and optionally `child.pid`) so the coordinator can kill it. The tracker does not need to store PID if the BullMQ job handler holds the process reference; when the job is removed or “cancel” is requested, the handler can call `child.kill()`.
- **Cancel API:** The local API can expose “cancel job J”. If the server runs BullMQ, “cancel” can be implemented by removing the job (or marking it failed) and, if the worker holds the child reference, signalling abort so the worker kills the child. No need to store PID in the tracker for that; the worker that owns the job owns the process.
- **Graceful shutdown:** Prefer `SIGTERM` first; after a short grace period (e.g. 10s), send `SIGKILL`. Document that the Ralph process (and cursor-agent) may not exit cleanly on SIGTERM; best effort.

---

## 5. Streaming and persisting output

Goals: API (or Cortex) can show progress without waiting for the child to exit; final result still available as today (workflow result, job return value).

**Option A – Stream forwarding + plan_output_stream (recommended):**

- In **child-job**, use `spawn` and pipe the child’s stdout/stderr (or a single combined stream) to a callback or async iterator.
- For each chunk (or line), optionally call Cortex MCP `append_plan_output(planId, content, iteration?)` so the plan’s output stream is updated in real time. The API can then expose “plan output” via existing Cortex/GraphQL (e.g. `get_plan_output` or activity) so clients see progress.
- The worker still collects stdout/stderr for the final `ChildJobResult` (e.g. on failure, include last N lines or full stderr). No change to the existing return shape for success/failure.
- **Streaming dependency:** When `streamToCortex` is enabled on `ChildJobInput`, the worker writes to Cortex Postgres (`plan_output_stream` table) via the same schema as MCP `append_plan_output`. Cortex (and thus ai-mcp Postgres config) must be reachable; if append fails, the worker logs and continues without failing the job. Clients that read plan output (e.g. `get_plan_output`, activity-by-date) see chunks in real time.

**Option B – Job progress (BullMQ):**

- The worker calls `job.updateProgress(percent, { phase, lastLine? })` periodically (e.g. on each chunk or every N seconds). The API can poll job progress to show “Ralph running… 45%” or “ensureCommit running lint…”.
- This does not persist to Cortex; it’s ephemeral job progress. Can be used together with Option A.

**Option C – Hybrid:**

- Stream to both: append important chunks to `plan_output_stream` (for Cortex and history) and call `job.updateProgress` for API polling. Gives API a simple progress API and Cortex a durable log.

**Recommendation:** Implement Option A (stream + optional `append_plan_output`) first so progress is visible in Cortex and any client that reads plan output. Add Option B if the API needs a lightweight progress endpoint without querying Cortex.

---

## 6. Lifecycle summary

1. **Start:** API adds job to queue; worker picks up job, acquires worktree, creates branch, starts Ralph via `spawn('pnpm', ralphArgs, { cwd: worktreePath, ... })`.
2. **Run:** Worker reads child stdout/stderr (streaming). Optionally: append chunks to `append_plan_output(planId, content)` and/or `job.updateProgress(...)`. If timeout or AbortSignal fires, worker kills child and proceeds to step 4 with a failure result.
3. **Exit:** Child exits (success or failure). Worker collects exit code and any buffered output, then runs ensureCommit (clean check + optional lint/test/typecheck). ensureCommit can stay `spawnSync` or be migrated to `spawn` with the same timeout/cancel/streaming ideas.
4. **Release:** Worker releases worktree target and returns `WorktreeWorkflowResult` (including ensureCommit) as job return value. API exposes result via existing job query.

---

## 7. Implementation order

1. **child-job.ts:** Replace `spawnSync` for `pnpm exec workflow-ralph` with `spawn` + Promise; support optional `timeoutMs` and `signal?: AbortSignal`; pipe stdout/stderr to a callback (and optionally to `append_plan_output`). No change to `ChildJobInput`/`ChildJobResult` shape except optional fields (e.g. `timeoutMs`, `onChunk?`).
2. **Tracker/API:** No change to tracker for PID; cancellation is via job removal or signal to the worker that holds the child. Document in [worktree-registration-and-allocation.md](./worktree-registration-and-allocation.md) that cancellation is handled by the job handler.
3. **Optional: parent-job ensureCommit** – Migrate nx checks to `spawn` + Promise with optional timeout and stream callback for progress.
4. **Optional: ralph.ts** – Migrate cursor-agent to `spawn` + Promise for streaming and per-iteration timeout when run in non-interactive mode.

---

## 8. Summary table (proposed)

| Component           | Spawns                 | Method                               | Blocking?                               | Output / progress                      |
| ------------------- | ---------------------- | ------------------------------------ | --------------------------------------- | -------------------------------------- |
| ralph.ts            | cursor-agent           | spawnSync today; optional spawn      | Yes today                               | Buffered; optional stream later        |
| child-job.ts        | git (keep), pnpm Ralph | spawn (Ralph), spawnSync (git)       | No (Ralph async)                        | Stream → callback / plan_output_stream |
| parent-job.ts       | git, pnpm nx           | spawnSync (git); optional spawn (nx) | No for nx if spawn                      | Optional stream for nx                 |
| runWorktreeWorkflow | (orchestrates above)   | N/A                                  | Loop async, steps async when spawn used | Result + optional live stream          |

This proposal enables the local API to trigger runs, stream progress (via Cortex or job progress), enforce timeouts, and cancel runs without introducing new worker processes.
