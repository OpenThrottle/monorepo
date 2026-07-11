# Ralph process model: spawn, worktree workflow, and lifecycle

This document describes how Node.js processes are spawned and how the worktree workflow composes acquire → runLoop → ensureCommit → release. It notes blocking vs non-blocking behavior and where streaming or async would help future API/server integration.

## Overview

**Current code:** `ralph.ts` dispatches each iteration to **one** execution backend (`cursor` or `claude`) via `run-iteration.ts` — **cursor-agent** or **Claude Code** (`claude` CLI) — selected once per process by `--backend` / env / `.workflow-ralph.json` (no mixing backends within a single plan run). It uses **spawn** when non-interactive (no TTY) and `spawnSync` when interactive; `child-job.ts` uses **spawn** for **pnpm exec workflow-ralph**. `runWorktreeWorkflow` composes acquire → runLoop (e.g. Ralph) → ensureCommit (lint/test/typecheck) → release. Tracker is in-memory or Redis-backed; no HTTP/API server yet for orchestrating spawns.

- **Ralph CLI** (`src/bin/ralph.ts`): Runs in the current process; each iteration runs the configured runner (default **cursor-agent**) via `spawnSync` when interactive (TTY) and via `spawn` + Promise when non-interactive, with optional per-iteration timeout (`--iteration-timeout`) and optional `onChunk` for streaming. Implementation: `src/bin/run-iteration.ts`.
- **Child job** (`src/utils/child-job.ts`): Runs inside a parent (e.g. BullMQ worker); spawns **pnpm exec workflow-ralph** via `spawn` in a worktree (timeout, AbortSignal, streaming).
- **Parent job** (`src/utils/parent-job.ts`): Uses `spawnSync` for git and for nx (lint/test/typecheck).
- **Workflow** (`src/utils/workflow.ts`): Composes acquire → runLoop → ensureCommit → release; the loop is async (e.g. `runChildJob`), but all subprocess calls inside it are currently synchronous.

No HTTP/API server exists yet for orchestrating spawns; the tracker is in-memory or Redis-backed (`IWorktreeTargetsTracker`), and jobs are triggered by BullMQ in openthrottle-server when worktree targets are configured. Queue spawns forward optional `ralph.backend` as `--backend` on nested `workflow-ralph` so automated runs match CLI defaults per plan run (exclusive runner for all iterations).

---

## 1. ralph.ts (CLI): spawning the iteration runner

**Files:** `tools/workflows/src/bin/ralph.ts` (loop, OpenThrottle), `tools/workflows/src/bin/run-iteration.ts` (single iteration)

- **What it spawns (one backend per run):** A shell command built from `--backend` (default `cursor`):
  - **`cursor`:** `cursor-agent --force -p "<agentPrompt>" [--model <model>]` (`cursor-agent` on PATH).
  - **`claude`:** `claude --bare --permission-mode acceptEdits -p "<agentPrompt>"` (optional `--model` unless preset is `auto`). Same injected prompt string as `cursor`; requires `claude` on PATH and Anthropic auth per their docs.
- **How (interactive, TTY):** `spawnSync(command, [], { encoding: 'utf-8', shell: true, stdio: ['inherit', 'pipe', 'pipe'] })`. Blocks until the child exits.
- **How (non-interactive, no TTY):** `spawn` + Promise; optional `timeoutMs` (per-iteration timeout, e.g. `--iteration-timeout <seconds>`), optional `AbortSignal`, optional `onChunk` for stdout/stderr streaming. On timeout or abort, child is killed (SIGTERM then SIGKILL after grace).
- **Blocking:** When interactive, the main process blocks for the entire duration of one agent run. When non-interactive, the loop uses async `runIterationAsync` so the process can handle timeouts and streaming; each iteration still runs sequentially.
- **Output:** stdout and stderr are captured (piped), then concatenated and returned as a string. When non-interactive and `onChunk` is provided, chunks are also forwarded in real time.

---

## 2. child-job.ts: spawning workflow-ralph in a worktree

**File:** `tools/workflows/src/utils/child-job.ts`

- **What it spawns:**
  - **Git:** `git -C <worktreePath> ...` via `spawnSync` (no shell) for `rev-parse` (branch name, HEAD SHA). Short, fast calls.
  - **Ralph:** `pnpm exec workflow-ralph --plan <planId>` plus optional argv from `buildWorkflowRalphRunTuningArgv` (e.g. `--backend`, `--iterations`, `--worktree` defaulting to `handoff.targetId`) with `cwd: worktreePath`, via **`spawn`** + Promise (`runRalphAsync`). Each iteration inside nested Ralph may pass agent `-w/--worktree` to cursor-agent/claude when configured. Optional `onChunk` forwards stdout/stderr; optional timeout and `AbortSignal`.
- **Blocking:** The caller awaits the Promise until `workflow-ralph` exits. Inner iteration runners (`cursor-agent` / `claude`) are spawned by the nested CLI per `--backend`.
- **Where streaming/async would help:** Chunk forwarding and `streamToOpenThrottle` already use `onChunk`; further work could push more progress surfaces without changing the spawn model.

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
   - Async from the workflow’s perspective. Typical implementation: `runChildJob({ handoff, planId, iterations })`, which awaits **`spawn`**-based `pnpm exec workflow-ralph` until exit. Optional streaming attaches while the child runs.

3. **Ensure commit (if loop succeeded):** `parentJobEnsureCommitBeforeRelease(handoff, ensureCommitOptions)`
   - Synchronous. Ensures working tree is clean; optionally runs lint/test/typecheck via nx (all `spawnSync`). Result is returned before release.

4. **Release:** `tracker.release({ id: targetId, lockedBy })`
   - Synchronous. Target is always released if acquire succeeded, so locks are not leaked on loop or ensure-commit failure.

**Blocking vs non-blocking:**

- The workflow function itself is async and uses `await runLoop(handoff)`, so the _caller_ can be async (e.g. BullMQ worker). Ralph in the loop uses async `spawn`; ensure-commit still uses `spawnSync` for git and nx checks unless migrated.
- **Streaming:** `runChildJob` can forward chunks (`onChunk`) and optional OpenThrottle `plan_output_stream` mirroring while the nested `workflow-ralph` runs. The workflow still returns a single `WorktreeWorkflowResult` when the loop finishes.

**Where more observability would help:**

- **Ensure-commit:** Exposing nx lint/test/typecheck output in real time would require streaming or polling around those `spawnSync` calls.
- **Cancellation:** Nested Ralph already supports timeout/abort on the `pnpm` child; propagating cancel from an HTTP API is a separate wiring task.
- **Concurrency:** Fan-out is one run per acquired target; each run still occupies the worker until Ralph + ensure-commit complete.

---

## 5. Tracker and process binding

- **Tracker:** `IWorktreeTargetsTracker` (implemented in-memory by `WorktreeTargetsTracker` or by a Redis-backed implementation). Used to acquire/release worktree targets; no process binding is stored—only `lockedBy` (e.g. job id).
- **Process binding:** The spawned Ralph process is bound to a repo/worktree only by **cwd**: `child-job` passes `cwd: worktreePath` to `spawn('pnpm', ralphArgs, { cwd: worktreePath, ... })`. Optional metrics sample the child PID while it runs. The tracker does not store PID; the coordinator (e.g. BullMQ) knows “job J holds target T” but not the nested PID unless logging/metrics add it.

### 5.1 Tracker thread-safety (acquire/release)

- **In-memory `WorktreeTargetsTracker`:** `acquire()` is **not** atomic under concurrent calls: there is a TOCTOU between reading an available target and marking it locked, so two callers can both "acquire" the same target. **Safe when at most one job runs at a time** (e.g. plans processor `concurrency: 1`). To run with CONCURRENCY > 1 and the in-memory tracker, add a process-local mutex around the acquire/release pair, or switch to a Redis-backed implementation that uses atomic operations (e.g. SET NX, Lua check-owner-and-delete for release).
- **Release:** `release({ id, lockedBy })` only succeeds when the target is locked and `lockedBy` matches; wrong-owner release returns `locked_by_other`, and double-release returns `not_locked`. So locks are not leaked and only the owner can release. The workflow always calls release once after a successful acquire (and parent-job releases on create-branch failure), so no leaked targets under normal or error paths.

---

## 6. Summary table

| Component           | Spawns                          | Method                          | Blocking?                               | Output handling                        |
| ------------------- | ------------------------------- | ------------------------------- | --------------------------------------- | -------------------------------------- |
| ralph.ts            | cursor-agent or Claude Code CLI | spawnSync (TTY), spawn (no TTY) | Yes when TTY                            | Buffered; optional stream when spawn   |
| child-job.ts        | git, pnpm workflow-ralph        | spawn (Ralph), spawnSync (git)  | No for Ralph                            | Stream → callback / plan_output_stream |
| parent-job.ts       | git, pnpm nx                    | spawnSync                       | Yes                                     | Buffered / exit code                   |
| runWorktreeWorkflow | (orchestrates above)            | N/A                             | Loop async, steps async when spawn used | Final result + optional live stream    |

**Takeaways for a future API/server:**

- **ralph.ts** and **child-job** use `spawn` + Promises when non-interactive (ralph) or for the Ralph subprocess (child-job), enabling streaming, per-iteration or per-run timeouts, and cancellation. Git and parent-job nx checks remain `spawnSync` unless optionally migrated.
- **Streaming** progress (agent output, check output) would require either stream forwarding from child processes or writing to a shared store (e.g. plan_output_stream, job progress).
- **Verification** (lint/test/typecheck) is part of the same process lifecycle in `parentJobEnsureCommitBeforeRelease`. How it is integrated with spawned jobs and how results are reported (job return value, optional OpenThrottle) is documented in [verification-and-reporting.md](./verification-and-reporting.md).
- **Worktree/repo registration** is via the tracker (target id + path); the spawned process is bound to a repo only by `cwd`. No HTTP server exists yet to trigger or list runs; that is the subject of the “Design local API/server” and “worktree/repo registration” tasks.

A concrete **process management proposal** (spawn vs spawnSync, workers, timeouts, cancellation, streaming/persisting output) is in [process-management-proposal.md](./process-management-proposal.md).
