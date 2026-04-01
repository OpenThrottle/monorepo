# Ralph process model: spawn, worktree workflow, and lifecycle

This document describes how Node.js processes are spawned and how the worktree workflow composes acquire → runLoop → ensureCommit → release. It notes blocking vs non-blocking behavior and where streaming or async would help future API/server integration.

## Overview

**Current code:** `ralph.ts` uses **spawn** for **cursor-agent** when non-interactive (no TTY) and `spawnSync` when interactive; `child-job.ts` uses **spawn** for **pnpm exec workflow-ralph**. `runWorktreeWorkflow` composes acquire → runLoop (e.g. Ralph) → ensureCommit (lint/test/typecheck) → release. Tracker is in-memory or Redis-backed; no HTTP/API server yet for orchestrating spawns.

- **Ralph CLI** (`src/bin/ralph.ts`): Runs in the current process; spawns **cursor-agent** via `spawnSync` when interactive (TTY) and via `spawn` + Promise when non-interactive, with optional per-iteration timeout (`--iteration-timeout`) and optional `onChunk` for streaming.
- **Child job** (`src/utils/child-job.ts`): Runs inside a parent (e.g. BullMQ worker); spawns **pnpm exec workflow-ralph** via `spawn` in a worktree (timeout, AbortSignal, streaming).
- **Parent job** (`src/utils/parent-job.ts`): Uses `spawnSync` for git and for nx (lint/test/typecheck).
- **Workflow** (`src/utils/workflow.ts`): Composes acquire → runLoop → ensureCommit → release; the loop is async (e.g. `runChildJob`), but all subprocess calls inside it are currently synchronous.

No HTTP/API server exists yet for orchestrating spawns; the tracker is in-memory or Redis-backed (`IWorktreeTargetsTracker`), and jobs are triggered by BullMQ in openthrottle-server when worktree targets are configured.

---

## 1. ralph.ts (CLI): spawning cursor-agent

**File:** `tools/workflows/src/bin/ralph.ts`

- **What it spawns:** `cursor-agent --force -p "<agentPrompt>" [--model <model>]` via a **shell** (e.g. `cursor-agent` on PATH).
- **How (interactive, TTY):** `spawnSync(command, [], { encoding: 'utf-8', shell: true, stdio: ['inherit', 'pipe', 'pipe'] })`. Blocks until the child exits.
- **How (non-interactive, no TTY):** `spawn` + Promise; optional `timeoutMs` (per-iteration timeout, e.g. `--iteration-timeout <seconds>`), optional `AbortSignal`, optional `onChunk` for stdout/stderr streaming. On timeout or abort, child is killed (SIGTERM then SIGKILL after grace).
- **Blocking:** When interactive, the main process blocks for the entire duration of one agent run. When non-interactive, the loop uses async `runIterationAsync` so the process can handle timeouts and streaming; each iteration still runs sequentially.
- **Output:** stdout and stderr are captured (piped), then concatenated and returned as a string. When non-interactive and `onChunk` is provided, chunks are also forwarded in real time.

---

## 2. child-job.ts: spawning workflow-ralph in a worktree

**File:** `tools/workflows/src/utils/child-job.ts`

- **What it spawns:**
  - **Git:** `git -C <worktreePath> ...` via `spawnSync` (no shell) for `rev-parse` (branch name, HEAD SHA). Short, fast calls.
  - **Ralph:** `pnpm exec workflow-ralph --plan <planId> [--iterations N]` with `cwd: worktreePath`, via `spawnSync(..., { encoding: 'utf-8', shell: true, stdio: ['inherit', 'pipe', 'pipe'] })`.
- **Blocking:** Yes. `runChildJob` is async (it awaits Cortex checks), but the actual Ralph run is synchronous: the parent Node process blocks until `pnpm exec workflow-ralph` exits. No output is streamed back; stdout/stderr are buffered and only used when the process has finished (e.g. for error reporting).
- **Where streaming/async would help:**
  - **Streaming:** Forwarding Ralph’s stdout/stderr to the API (or to Cortex `plan_output_stream`) so progress is visible without waiting for the child to exit. Would require `spawn` + stream forwarding or a side-channel (e.g. append to plan output on each chunk).
  - **Async:** The caller (`runWorktreeWorkflow`) already uses `await runLoop(handoff)`; the bottleneck is that `runLoop` internally blocks on `spawnSync`. Using `spawn` + Promises would allow the process to do other work while waiting, and would be a prerequisite for cancellation/timeouts and for streaming.

---

## 3. parent-job.ts: acquire, branch, ensure-commit, checks

**File:** `tools/workflows/src/utils/parent-job.ts`

- **What it spawns:**
  - **Acquire + branch:** `git -C <worktreePath> checkout -b <branchName> <baseBranch>` via `spawnSync` (no shell).
  - **Clean check:** `git -C <worktreePath> status --porcelain` and `status --short` via `spawnSync`.
  - **Verification (lint/test/typecheck):** `pnpm exec nx affected -t <check> --base <base>` or `pnpm exec nx run-many -t <check>` via `spawnSync` with `shell: true` and `stdio: ['inherit', 'pipe', 'pipe']`.
- **Blocking:** All of these are synchronous. The entire ensure-commit step (clean check + optional lint/test/typecheck) blocks the parent until all checks finish. Checks run sequentially (lint, then test, then typecheck).
- **Where streaming/async would help:**
  - **Streaming:** Exposing nx check output (e.g. test/lint results) in real time for API or UI.
  - **Async:** Running checks in parallel (e.g. lint + test + typecheck concurrently) or allowing the API to poll status while checks run; cancellation of long-running checks would also require async spawn + abort.

---

## 4. runWorktreeWorkflow: acquire → runLoop → ensureCommit → release

**File:** `tools/workflows/src/utils/workflow.ts`

**Sequence:**

1. **Acquire:** `parentJobAcquireAndCreateBranch(tracker, acquireOptions)`
   - Synchronous. Tracker locks a target; git creates a branch in the worktree. On failure (e.g. no targets, checkout failure), returns immediately; target is released if branch creation fails.

2. **Run loop:** `await runLoop(handoff)`
   - Async from the workflow’s perspective. Typical implementation: `runChildJob({ handoff, planId, iterations })`, which internally uses `spawnSync` for Ralph, so the process blocks for the whole Ralph run. No intermediate progress is exposed; the workflow only gets a result when the child exits.

3. **Ensure commit (if loop succeeded):** `parentJobEnsureCommitBeforeRelease(handoff, ensureCommitOptions)`
   - Synchronous. Ensures working tree is clean; optionally runs lint/test/typecheck via nx (all `spawnSync`). Result is returned before release.

4. **Release:** `tracker.release({ id: targetId, lockedBy })`
   - Synchronous. Target is always released if acquire succeeded, so locks are not leaked on loop or ensure-commit failure.

**Blocking vs non-blocking:**

- The workflow function itself is async and uses `await runLoop(handoff)`, so the _caller_ can be async (e.g. BullMQ worker). The actual work inside the loop and inside ensure-commit is blocking because all subprocess calls use `spawnSync`.
- No streaming: the API or caller only sees the final `WorktreeWorkflowResult` (acquire, loop, ensureCommit, released) after the whole workflow finishes.

**Where streaming/async would help:**

- **Progress:** Exposing loop progress (e.g. agent output, iteration count) and ensure-commit progress (which check is running, stdout/stderr) would require either:
  - Switching child-job (and optionally ralph.ts) to `spawn` and forwarding streams to the API or to Cortex `plan_output_stream`, or
  - A separate side-channel (e.g. job progress updates, Redis, or DB) that the child or parent writes to while running.
- **Cancellation/timeouts:** Implementing timeouts or “cancel run” from an API would require async spawn (e.g. `spawn` + `child.kill()`) and possibly propagating abort to the Ralph process.
- **Concurrency:** The workflow already supports fan-out (one run per acquired target). The main limitation is that each run blocks the worker for the full duration of Ralph + ensure-commit; async spawn wouldn’t increase parallelism per run but would allow the process to handle other work or stream output while waiting.

---

## 5. Tracker and process binding

- **Tracker:** `IWorktreeTargetsTracker` (implemented in-memory by `WorktreeTargetsTracker` or by a Redis-backed implementation). Used to acquire/release worktree targets; no process binding is stored—only `lockedBy` (e.g. job id).
- **Process binding:** The spawned Ralph process is bound to a repo/worktree only by **cwd**: `child-job` passes `cwd: worktreePath` to `spawnSync('pnpm', ralphArgs, { cwd: worktreePath, ... })`. There is no process registry or PID stored in the tracker; the coordinator (e.g. BullMQ) knows “job J holds target T” but not the PID of the Ralph process. For cancellation or “list running runs,” a future design would need to track PIDs or use another mechanism (e.g. job token, sidecar process).

### 5.1 Tracker thread-safety (acquire/release)

- **In-memory `WorktreeTargetsTracker`:** `acquire()` is **not** atomic under concurrent calls: there is a TOCTOU between reading an available target and marking it locked, so two callers can both "acquire" the same target. **Safe when at most one job runs at a time** (e.g. plans processor `concurrency: 1`). To run with CONCURRENCY > 1 and the in-memory tracker, add a process-local mutex around the acquire/release pair, or switch to a Redis-backed implementation that uses atomic operations (e.g. SET NX, Lua check-owner-and-delete for release).
- **Release:** `release({ id, lockedBy })` only succeeds when the target is locked and `lockedBy` matches; wrong-owner release returns `locked_by_other`, and double-release returns `not_locked`. So locks are not leaked and only the owner can release. The workflow always calls release once after a successful acquire (and parent-job releases on create-branch failure), so no leaked targets under normal or error paths.

---

## 6. Summary table

| Component           | Spawns                   | Method                          | Blocking?                               | Output handling                        |
| ------------------- | ------------------------ | ------------------------------- | --------------------------------------- | -------------------------------------- |
| ralph.ts            | cursor-agent             | spawnSync (TTY), spawn (no TTY) | Yes when TTY                            | Buffered; optional stream when spawn   |
| child-job.ts        | git, pnpm workflow-ralph | spawn (Ralph), spawnSync (git)  | No for Ralph                            | Stream → callback / plan_output_stream |
| parent-job.ts       | git, pnpm nx             | spawnSync                       | Yes                                     | Buffered / exit code                   |
| runWorktreeWorkflow | (orchestrates above)     | N/A                             | Loop async, steps async when spawn used | Final result + optional live stream    |

**Takeaways for a future API/server:**

- **ralph.ts** and **child-job** use `spawn` + Promises when non-interactive (ralph) or for the Ralph subprocess (child-job), enabling streaming, per-iteration or per-run timeouts, and cancellation. Git and parent-job nx checks remain `spawnSync` unless optionally migrated.
- **Streaming** progress (agent output, check output) would require either stream forwarding from child processes or writing to a shared store (e.g. plan_output_stream, job progress).
- **Verification** (lint/test/typecheck) is part of the same process lifecycle in `parentJobEnsureCommitBeforeRelease`. How it is integrated with spawned jobs and how results are reported (job return value, optional Cortex) is documented in [verification-and-reporting.md](./verification-and-reporting.md).
- **Worktree/repo registration** is via the tracker (target id + path); the spawned process is bound to a repo only by `cwd`. No HTTP server exists yet to trigger or list runs; that is the subject of the “Design local API/server” and “worktree/repo registration” tasks.

A concrete **process management proposal** (spawn vs spawnSync, workers, timeouts, cancellation, streaming/persisting output) is in [process-management-proposal.md](./process-management-proposal.md).
