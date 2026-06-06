# Worktree/repo registration and allocation for N repos

This document defines how N worktree targets (or separate repos) are registered with the server, how they are allocated when a Ralph job is spawned, and how the spawned process is bound to a specific repo/worktree. It reuses `IWorktreeTargetsTracker` and extends it only where allocation semantics require (e.g. optional worktree preference).

---

## 1. Registration: how targets are registered with the server

**Current mechanism (single server / NestJS):**

- **Source:** Environment variable `WORKTREE_TARGETS` (JSON).
- **Parser:** `getWorktreeTargetsFromEnv()` in `@openthrottle/nestjs-worktrees` (see `worktree-targets.env.ts`).
- **Format:** Array of targets. Each target is either:
  - `{ "id": string, "path": string }`, or
  - `[id, path]` tuple (id and path as strings).
- **Where it’s used:** `NestjsWorktreesModule` builds a base `WorktreeTargetsTracker` from env, wraps it with `MutexWorktreeTargetsTracker` (`async-mutex`), and provides the result as `WORKTREE_TRACKER_TOKEN`. The server (e.g. openthrottle-server) has one tracker instance; all BullMQ workers in that process share it.

**In-memory tracker extension:**

- `WorktreeTargetsTracker` (local aligned copy in `@openthrottle/nestjs-worktrees`; canonical implementation in `@tools/workflows`) supports **dynamic registration**: `register(id, path)`. So targets can be added at runtime in addition to env. The interface `IWorktreeTargetsTracker` does not expose `register`; it is an implementation detail of the in-memory tracker. If a future “registration API” is added, the server could call `tracker.register(id, path)` when using the in-memory implementation, or use a Redis-backed tracker that reads from a Redis set/key.

**N repos vs N worktrees:**

- **N worktrees:** All entries in `WORKTREE_TARGETS` are paths to **worktrees of the same repo** (same monorepo, different dirs). Each has a unique `id`. This is the primary use case today: one monorepo, multiple worktree directories, each used by at most one Ralph run at a time.
- **N separate repos:** If targets point to **different repositories** (e.g. different remotes or clones), the same model applies: each target is an `(id, path)`. The path is the root of that repo (or a worktree of it). The server does not distinguish “same repo” vs “different repo”; it only cares that each target has a path to run `git` and `pnpm` in. So “N repos” is supported by registering N targets with different paths (and distinct ids).

**Summary (registration):**

| Aspect               | Current / recommendation                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Source**           | `WORKTREE_TARGETS` env (JSON array).                                                                   |
| **Optional future**  | File-based config, or REST/GraphQL “register target” that calls `register(id, path)` or updates Redis. |
| **Multi-worker**     | Use a Redis-backed `IWorktreeTargetsTracker` so all workers see the same targets and lock state.       |
| **N separate repos** | Register each repo (or worktree) as a target `{ id, path }`; no interface change.                      |

---

## 2. Allocation: how a target is chosen when a Ralph job is spawned

**Reuse of `IWorktreeTargetsTracker`:**

- Allocation is **acquire**. The tracker already defines:
  - `acquire(options: { id?: string; lockedBy: string }): AcquireResult`
  - If `id` is provided: lock that target **only if it is available**; otherwise return `all_locked` or `id_not_found`.
  - If `id` is omitted: lock the **first available** target (arbitrary order).

**Who calls acquire:**

- `parentJobAcquireAndCreateBranch(tracker, options)` in `parent-job.ts` calls `tracker.acquire({ lockedBy })`. Today it does **not** pass an `id`; so every job gets “any available” target.
- To support “run Ralph on worktree X when possible,” the **options** passed into the workflow must include an optional worktree id. So we extend **allocation** as follows.

**Extension (optional worktree preference):**

- Add to `ParentJobAcquireOptions`: **`worktreeId?: string`** (optional).
- In `parentJobAcquireAndCreateBranch`, pass it through to the tracker:
  - `tracker.acquire({ id: options.worktreeId, lockedBy })`.
- When the API (or BullMQ job payload) includes `worktreeId`:
  - **Processor** passes `acquire: { lockedBy: jobId, worktreeId: job.data.worktreeId }` into `runWorktreeWorkflow`.
  - If `worktreeId` is set and that target is available → that target is acquired.
  - If `worktreeId` is set and that target is **not** available (locked or missing):
    - **Fail-fast (recommended):** Treat as acquire failure; do not enqueue another target. Return `acquire_failed` with reason `all_locked` or `id_not_found` so the API can report “requested worktree not available.”
    - **Fallback (optional):** If product wants “prefer X, else any,” the processor could first try `acquire({ id: worktreeId, lockedBy })` and on failure call `acquire({ lockedBy })`; this would require documenting and possibly a small helper to avoid duplicate code.

**Recommendation:** Implement **fail-fast** when `worktreeId` is provided and that target is not available. This keeps semantics clear and avoids surprise allocation to a different worktree.

**Summary (allocation):**

| Aspect          | Design                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Interface**   | Reuse `IWorktreeTargetsTracker.acquire({ id?, lockedBy })`. No change to the tracker interface.                   |
| **Options**     | Extend `ParentJobAcquireOptions` with optional `worktreeId`. Parent job passes it as `id` to `acquire`.           |
| **Behavior**    | If `worktreeId` provided and target available → lock that target. If not available → fail (no fallback to “any”). |
| **Job payload** | Extend `RunPlanJobData` with optional `worktreeId`; processor passes it into `acquire` options.                   |

---

## 3. Binding: how the spawned process is bound to a specific repo/worktree

**What “binding” means:**

- The Ralph process (and any verification steps) must run in the **correct** repo/worktree. Binding is the guarantee that all commands for that job run with that target’s path as cwd (and that the target stays locked for the job until release).

**Mechanism (no PID, no process registry):**

- **Lock:** When a target is acquired, the tracker marks it **locked** with `lockedBy` (e.g. BullMQ job id). No process id (PID) or handle is stored in the tracker.
- **Handoff:** After acquire and create-branch, the workflow has a `ParentJobHandoff`: `{ branchName, targetId, worktreePath }`. This is the **binding**: the child job and ensure-commit step use `worktreePath` as the working directory for all git and pnpm commands.
- **Spawn:** `runChildJob(handoff, ...)` runs `pnpm exec workflow-ralph ...` with `cwd: handoff.worktreePath`. So the **only** binding of the Ralph process to the repo/worktree is **process cwd**.
- **Agent CLI worktree (separate layer):** Nested Ralph may forward `-w` / `--worktree` to **cursor-agent** or **claude** per iteration. By default, when job tuning omits `ralph.worktree`, `runChildJob` passes `--worktree <targetId>` on nested argv so the agent name aligns with the acquired target id. This does **not** change git cwd or tracker binding. See [ralph-worktree-flag.md](../../../docs/workflows/ralph-worktree-flag.md).
- **Release:** When the workflow finishes (success or failure), it calls `tracker.release({ id: handoff.targetId, lockedBy })`. The target becomes available again. The coordinator (e.g. BullMQ) knows “job J held target T” via the job’s lifecycle and the fact that `lockedBy === jobId`; it does **not** need to know the PID of the Ralph process.

**Implications:**

- **Cancellation:** Cancellation is handled by the job handler: the worker that runs the workflow holds the child process reference (from `spawn` in child-job). The tracker does **not** store a PID. To cancel a run, the API removes or fails the job and signals abort (e.g. via BullMQ job cancellation or an AbortSignal passed into the workflow); the worker then kills the child (SIGTERM, then SIGKILL after a short grace period). The worker that owns the job owns the process. See [process-management-proposal.md](./process-management-proposal.md) §4.
- **Listing “who is using which target”:** Use `tracker.listTargets()`; locked targets show `lockedBy`. No need to expose PIDs for allocation or binding.
- **Multiple workers:** With a Redis-backed tracker, each worker still binds by handoff (targetId + worktreePath); the lock is global, so two workers cannot acquire the same target.

**Summary (binding):**

| Aspect          | Design                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **Binding**     | Handoff `(targetId, worktreePath, branchName)`; all git/pnpm in that run use `worktreePath` as cwd.     |
| **Spawn**       | `runChildJob` passes `cwd: handoff.worktreePath` to `spawnSync` (or future `spawn`). No PID in tracker. |
| **Release**     | Always `tracker.release({ id: targetId, lockedBy })` after the workflow step (success or failure).      |
| **Coordinator** | Job id is `lockedBy`; “job J → target T” is implicit in the workflow run; no process registry required. |

---

## 4. References

- **Tracker interface and types:** `tools/workflows/src/types/worktree.ts` (`IWorktreeTargetsTracker`, `ParentJobHandoff`, `ParentJobAcquireOptions`).
- **In-memory tracker:** `tools/workflows/src/utils/worktree-targets.ts` (`WorktreeTargetsTracker`, `register()`).
- **Env parsing:** `packages/nestjs-worktrees/src/worktree-targets.env.ts` (`getWorktreeTargetsFromEnv()`).
- **Nest module:** [`packages/nestjs-worktrees/README.md`](../../../packages/nestjs-worktrees/README.md).
- **Workflow:** `tools/workflows/src/utils/workflow.ts` (`runWorktreeWorkflow`); `parent-job.ts` (`parentJobAcquireAndCreateBranch`); `child-job.ts` (`runChildJob` with `cwd: worktreePath`).
- **Process model:** [process-model.md](./process-model.md).
- **Agent CLI `--worktree`:** [ralph-worktree-flag.md](../../../docs/workflows/ralph-worktree-flag.md).
- **Process management (spawn, timeout, cancel, streaming):** [process-management-proposal.md](./process-management-proposal.md).
- **Local API (trigger, worktreeId in job):** [local-api-design.md](./local-api-design.md).
