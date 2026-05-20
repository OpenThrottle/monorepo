/**
 * Types for worktree target tracking (BullMQ workflow fan-out/fan-in).
 * Used to model and expose availability of worktree targets for Ralph loops.
 */

import type { RalphExecutionBackendId } from '../utils/ralph-execution-backend';
import type { RalphNestedDebugCli } from '../utils/workflow-ralph-nested-argv';
import type {
  ChildProcessMetrics,
  ChildProcessMetricsOptions,
} from './child-process-metrics';
import type { WallClockMetrics } from './wall-clock-metrics';

/** Status of a worktree target: available for work or locked by a job. */
export type WorktreeTargetStatus = 'available' | 'locked';

/** Snapshot of a worktree target in available state. */
export interface WorktreeTargetAvailable {
  readonly id: string;
  readonly path: string;
  readonly status: 'available';
}

/** Snapshot of a worktree target in locked state. */
export interface WorktreeTargetLocked {
  readonly id: string;
  readonly path: string;
  readonly status: 'locked';
  readonly lockedBy: string;
}

/** Discriminated union for worktree target state. */
export type WorktreeTarget = WorktreeTargetAvailable | WorktreeTargetLocked;

/** Result of attempting to acquire a worktree target. */
export type AcquireResult =
  | { ok: true; target: WorktreeTargetLocked }
  | { ok: false; reason: 'no_targets' | 'all_locked' | 'id_not_found' };

/** Result of attempting to release a worktree target. */
export type ReleaseResult =
  | { ok: true }
  | { ok: false; reason: 'id_not_found' | 'not_locked' | 'locked_by_other' };

/**
 * @description Interface for tracking worktree targets and their availability.
 * Implementations may be in-memory (single process), mutex-wrapped, or Redis-backed.
 * acquire/release may be sync or async to support mutex-protected implementations.
 */
export interface IWorktreeTargetsTracker {
  /** All registered targets and their current status. */
  listTargets(): readonly WorktreeTarget[];

  /** Whether at least one target is available. */
  hasAvailableTarget(): boolean;

  /** First available target, or undefined if none. */
  getAvailableTarget(): WorktreeTargetAvailable | undefined;

  /**
   * Lock a target: by id (must be available), or any available if id omitted.
   * Returns the locked target snapshot or failure reason.
   * May be async for mutex-protected or Redis-backed implementations.
   */
  acquire(options: {
    id?: string;
    lockedBy: string;
  }): AcquireResult | Promise<AcquireResult>;

  /**
   * Unlock a target by id. Fails if not locked or locked by a different owner.
   * May be async for mutex-protected or Redis-backed implementations.
   */
  release(options: {
    id: string;
    lockedBy: string;
  }): ReleaseResult | Promise<ReleaseResult>;
}

/** Payload passed from parent job to child (Ralph loop) after acquiring target and creating branch. */
export interface ParentJobHandoff {
  readonly branchName: string;
  readonly targetId: string;
  readonly worktreePath: string;
}

/** Options for the parent job: acquire target and create branch. */
export interface ParentJobAcquireOptions {
  /** Base branch to create from (e.g. main). Defaults to "main". */
  readonly baseBranch?: string;
  /** Unique identifier for the job (used as lockedBy). */
  readonly lockedBy: string;
  /** Optional branch name; if omitted a name is derived from lockedBy + timestamp. */
  readonly branchName?: string;
  /**
   * Optional plan title used to generate a human-readable branch name.
   * When provided (and branchName is not), the branch name is derived as `ralph/<slugified-title>-<suffix>`.
   * The title is slugified (lowercase, special chars to hyphens, max 50 chars) for git compatibility.
   */
  readonly planTitle?: string;
  /**
   * Optional worktree target id. When set, acquire locks this target only if available;
   * if not available, acquire fails (fail-fast). When omitted, any available target is used.
   */
  readonly worktreeId?: string;
}

/** Result of parent job acquire + create-branch step. */
export type ParentJobAcquireResult =
  | { ok: true; handoff: ParentJobHandoff }
  | {
      ok: false;
      detail?: string;
      reason: 'acquire_failed' | 'create_branch_failed';
    };

/** Chunk of stdout or stderr from the Ralph child process (for streaming). */
export type ChildJobStreamChunk =
  | { readonly stream: 'stdout'; readonly data: string }
  | { readonly stream: 'stderr'; readonly data: string };

/** Input for the child job: run Ralph loop in the worktree and return branch + SHA. */
export interface ChildJobInput {
  /** Handoff from parent (branch name, target id, worktree path). */
  readonly handoff: ParentJobHandoff;
  /** Cortex plan UUID to run Ralph for. */
  readonly planId: string;
  /** Max Ralph iterations when not task-centric. Omitted uses Ralph default. */
  readonly iterations?: number;
  /**
   * Execution backend (layer 2). One of {@link RalphExecutionBackendId} (`cursor` | `claude`); the
   * same id applies to the entire nested run, not per iteration. Omitted uses workflow-ralph
   * default (`cursor`). Passed as `--backend` when not the default.
   */
  readonly backend?: RalphExecutionBackendId;
  /**
   * Prompt profile (layer 1). Omitted uses workflow-ralph built-in default (`/agents/ralph`).
   * Passed as `--prompt` when not the default.
   */
  readonly prompt?: string;
  /**
   * UTF-8 prompt file path (layer 1). When set, forwarded as `--prompt-file` and takes precedence over `prompt`.
   * Use repo-relative or absolute paths; resolution is against the worktree cwd for nested runs.
   */
  readonly promptFile?: string;
  /** Cursor model; forwarded as `--model` when not the default (`auto`). */
  readonly model?: string;
  /** NX project name; forwarded as `--project` when set. */
  readonly project?: string;
  /**
   * Per-iteration timeout in **seconds** for workflow-ralph (non-interactive child); forwarded as `--iteration-timeout`.
   */
  readonly iterationTimeoutSeconds?: number;
  /**
   * Shim debug level for nested runs; forwarded as `--debug` or `--verbose` when not `omit`.
   */
  readonly ralphDebugCli?: RalphNestedDebugCli;
  /**
   * Agent CLI worktree name. When omitted inside `runChildJob`, defaults to `handoff.targetId`.
   */
  readonly worktree?: string;
  /** Cursor-only: `--worktree-base`. */
  readonly worktreeBase?: string;
  /** Cursor-only: `--skip-worktree-setup`. */
  readonly skipWorktreeSetup?: boolean;
  /** Optional timeout in milliseconds; on expiry the child is killed (SIGTERM then SIGKILL after grace). */
  readonly timeoutMs?: number;
  /** Optional AbortSignal; when aborted the child is killed (SIGTERM then SIGKILL after grace). */
  readonly signal?: AbortSignal;
  /** Optional callback invoked for each stdout/stderr chunk while the child runs. */
  readonly onChunk?: (chunk: ChildJobStreamChunk) => void;
  /**
   * When true, append each stdout/stderr chunk to Cortex plan_output_stream (same as MCP append_plan_output).
   * Requires Cortex/mcp-developer and Postgres; stream is updated in real time for API/clients that read plan output.
   */
  readonly streamToCortex?: boolean;
  /** Optional iteration number when streaming to Cortex (e.g. Ralph iteration); stored with each chunk. */
  readonly streamIteration?: number | null;
  /**
   * Options for child process CPU/memory polling. When set, polls the spawned Ralph process
   * and returns ChildProcessMetrics in the result. Defaults to enabled with 5s interval.
   */
  readonly childProcessMetrics?: ChildProcessMetricsOptions | false;
  /**
   * When set, nested `workflow-ralph` and parent-side Cortex checks use this URL (e.g. TypeORM `url`
   * from openthrottle-server) so foreign `cwd` cannot desync Postgres identity from the API worker.
   */
  readonly canonicalCortexPostgresUrl?: string;
}

/** Successful result of the child job: branch and commit SHA for parent to validate before release. */
export interface ChildJobSuccess {
  readonly branchName: string;
  readonly commitSha: string;
  readonly ok: true;
  /** True if all tasks were completed/skipped and plan was set to COMPLETED. */
  readonly planCompleted: boolean;
  /** Child process CPU/memory metrics (if polling was enabled). */
  readonly childProcessMetrics?: ChildProcessMetrics;
  /** Wall-clock vs CPU time metrics for determining CPU/I/O bound behavior. */
  readonly wallClockMetrics?: WallClockMetrics;
}

/** Failed result of the child job. */
export interface ChildJobFailure {
  readonly ok: false;
  readonly reason: string;
  readonly stderr?: string;
  /** Child process CPU/memory metrics (if polling was enabled and samples were collected). */
  readonly childProcessMetrics?: ChildProcessMetrics;
  /** Wall-clock vs CPU time metrics for determining CPU/I/O bound behavior. */
  readonly wallClockMetrics?: WallClockMetrics;
}

/** Result of running the child job (Ralph loop); returned to BullMQ parent for commit checks and release. */
export type ChildJobResult = ChildJobSuccess | ChildJobFailure;

/** Options for parent job: ensure commit and checks before releasing target. */
export interface ParentJobEnsureCommitOptions {
  /**
   * Base ref for nx affected (e.g. main or origin/main).
   * When set, runs lint/test/typecheck only for affected projects.
   */
  readonly base?: string;
  /**
   * When true (default), run lint, test, and typecheck in the worktree before releasing.
   * When false, only verify working tree is clean.
   */
  readonly runChecks?: boolean;
  /**
   * Optional timeout in ms for nx checks (each of lint/test/typecheck).
   * On expiry the child is killed (SIGTERM then SIGKILL after grace).
   */
  readonly timeoutMs?: number;
  /**
   * Optional AbortSignal; when aborted the nx check child is killed (SIGTERM then SIGKILL after grace).
   */
  readonly signal?: AbortSignal;
  /**
   * Optional callback invoked for each stdout/stderr chunk during nx checks (progress).
   */
  readonly onChunk?: (chunk: ChildJobStreamChunk) => void;
}

/** Success: working tree clean and checks (if requested) passed. */
export interface ParentJobEnsureCommitSuccess {
  readonly ok: true;
}

/** Failure: working tree has uncommitted changes. */
export interface ParentJobEnsureCommitFailureDirty {
  readonly ok: false;
  readonly reason: 'working_tree_dirty';
  readonly detail?: string;
}

/** Failure: lint, test, or typecheck failed. */
export interface ParentJobEnsureCommitFailureChecks {
  readonly ok: false;
  readonly reason: 'checks_failed';
  readonly check: 'lint' | 'test' | 'typecheck';
  readonly stderr?: string;
  readonly stdout?: string;
}

/** Failure: nx checks timed out. */
export interface ParentJobEnsureCommitFailureTimeout {
  readonly ok: false;
  readonly reason: 'checks_timed_out';
  readonly stderr?: string;
  readonly stdout?: string;
}

/** Failure: nx checks were cancelled (AbortSignal). */
export interface ParentJobEnsureCommitFailureCancelled {
  readonly ok: false;
  readonly reason: 'checks_cancelled';
  readonly stderr?: string;
  readonly stdout?: string;
}

/** Result of ensure-commit-before-release step. */
export type ParentJobEnsureCommitResult =
  | ParentJobEnsureCommitSuccess
  | ParentJobEnsureCommitFailureDirty
  | ParentJobEnsureCommitFailureChecks
  | ParentJobEnsureCommitFailureTimeout
  | ParentJobEnsureCommitFailureCancelled;

/**
 * Minimal result from a workflow loop (e.g. Ralph child job or custom runner).
 * Used by the reusable worktree workflow to run any loop with allocation and commit guarantees.
 */
export type WorkflowLoopResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string; readonly stderr?: string };

/**
 * Options for the reusable worktree workflow: acquire target, run a loop, ensure commit, then release.
 * Supports fan-out/fan-in: one caller can run multiple workflows (each acquires a target); each run
 * is independent with its own lock and release.
 */
export interface WorktreeWorkflowOptions {
  /** Tracker for worktree targets (in-memory or Redis-backed). */
  readonly tracker: IWorktreeTargetsTracker;
  /** Options for acquire + create-branch step. */
  readonly acquire: ParentJobAcquireOptions;
  /**
   * Run the loop in the worktree (e.g. Ralph child job). Receives handoff from acquire step.
   * Return a result with ok true/false; on failure the workflow still releases the target.
   */
  readonly runLoop: (handoff: ParentJobHandoff) => Promise<WorkflowLoopResult>;
  /** Options for ensure-commit-before-release (base for nx affected, runChecks). Default: runChecks true. */
  readonly ensureCommit?: ParentJobEnsureCommitOptions;
}

/**
 * Result of running the worktree workflow. Each step is reported so callers can retry or alert.
 */
export interface WorktreeWorkflowResult {
  /** Whether the target was acquired and branch created. */
  readonly acquire: ParentJobAcquireResult;
  /** Result of the loop (only present if acquire succeeded). */
  readonly loop?: WorkflowLoopResult;
  /** Result of ensure-commit (only present if acquire and loop succeeded). */
  readonly ensureCommit?: ParentJobEnsureCommitResult;
  /** Whether the target was released (always true if acquire succeeded, so the target is never left locked). */
  readonly released: boolean;
}
