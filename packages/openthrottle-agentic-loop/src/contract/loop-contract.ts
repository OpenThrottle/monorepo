/**
 * Narrow dependency interfaces and value types for the OT Loop parent state machine.
 *
 * The loop is a pure function over these; real implementations (GraphQL client, driver runner,
 * validator, git) plug in from other packages and the server.
 */

/** @public */
export const LOOP_TASK_STATUS = {
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  QUEUED: 'QUEUED',
  SKIPPED: 'SKIPPED',
} as const;

/** @public */
export type LoopTaskStatus =
  (typeof LOOP_TASK_STATUS)[keyof typeof LOOP_TASK_STATUS];

/** @public */
export const LOOP_PLAN_STATUS = {
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
} as const;

/** @public */
export type LoopPlanStatus =
  (typeof LOOP_PLAN_STATUS)[keyof typeof LOOP_PLAN_STATUS];

/** @public */
export interface LoopTask {
  readonly category: string | null;
  readonly createdAt: string;
  readonly description: string;
  readonly id: string;
  readonly requirements: readonly string[];
  readonly sortOrder: number;
  readonly status: LoopTaskStatus;
  readonly title: string;
}

/** @public */
export interface LoopFollowUp {
  readonly category: string | null;
  readonly description: string;
  readonly title: string;
}

// ---------------------------------------------------------------------------
// Worker result (docs/workflows/ot-loop-job.md § 5)
// ---------------------------------------------------------------------------

/** @public */
export interface WorkerResult {
  readonly commitMessage: string | null;
  readonly followUps: readonly LoopFollowUp[];
  readonly reason: string;
  readonly status: 'blocked' | 'done' | 'skipped';
}

/** @public */
export type WorkerResultRead =
  | { readonly kind: 'malformed'; readonly error: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'ok'; readonly result: WorkerResult };

/**
 * @description What one worker invocation produced: a result-file read, or an abnormal end.
 * @public
 */
export type WorkerAttemptResult =
  | WorkerResultRead
  | { readonly kind: 'aborted' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'usage_limited' };

/** @public */
export type AttemptFailure =
  | { readonly kind: 'commit'; readonly output: string }
  | {
      readonly kind: 'validation';
      readonly command: string;
      readonly exitCode: number;
      readonly tail: string;
    }
  | { readonly kind: 'worker'; readonly message: string };

/** @public */
export interface WorkerAttemptInput {
  /** Run-scoped operator guidance, oldest first; empty when none was claimed yet. */
  readonly guidance: readonly string[];
  readonly model: string | undefined;
  readonly previousFailure: AttemptFailure | undefined;
  readonly signal: AbortSignal;
  readonly task: LoopTask;
}

/** @public */
export interface WorkerRunner {
  run(input: WorkerAttemptInput): Promise<WorkerAttemptResult>;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/** @public */
export type ValidationResult =
  | { readonly kind: 'aborted' }
  | { readonly kind: 'green' }
  | {
      readonly kind: 'red';
      readonly command: string;
      readonly exitCode: number;
      readonly tail: string;
    };

/** @public */
export interface LoopValidator {
  validate(input: {
    readonly signal: AbortSignal;
    readonly task: LoopTask;
    readonly taskStartSha: string;
  }): Promise<ValidationResult>;
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

/** @public */
export interface GitHeadState {
  readonly branch: string;
  readonly sha: string;
}

/** @public */
export type GitCommitResult =
  | { readonly kind: 'committed'; readonly sha: string }
  | { readonly kind: 'failed'; readonly output: string }
  | { readonly kind: 'nothing_to_commit' };

/**
 * @description What discarding a task's changes saved: the `git diff --stat` summary of the
 * patch (empty when the task left nothing), which the loop posts to plan output (§ 5).
 * @public
 */
export interface DiscardTaskChangesResult {
  readonly statSummary: string;
}

/** @public */
export interface LoopGit {
  /** Commit with the message (or a fallback) plus Plan-Id/Task-Id footers. */
  commit(input: {
    readonly commitMessage: string | null;
    readonly planId: string;
    readonly task: LoopTask;
  }): Promise<GitCommitResult>;
  /** Save the task's changes as a patch, then restore the worktree to the task start sha. */
  discardTaskChanges(input: {
    readonly taskId: string;
    readonly taskStartSha: string;
  }): Promise<DiscardTaskChangesResult>;
  head(): Promise<GitHeadState>;
  /** Check out the run branch and `reset --soft` to the sha (keeps changes, drops commits). */
  restoreHead(input: GitHeadState): Promise<void>;
}

// ---------------------------------------------------------------------------
// OT client, clock, cancel
// ---------------------------------------------------------------------------

/** @public */
export interface LoopClient {
  /** Claim the plan inbox once; returns the claimed message bodies (STEERs first, oldest first). */
  claimInbox(input: { readonly taskId: string }): Promise<readonly string[]>;
  createFollowUps(input: {
    readonly followUps: readonly LoopFollowUp[];
    readonly planId: string;
  }): Promise<void>;
  endWorkSession(sessionId: string): Promise<void>;
  getPlanStatus(planId: string): Promise<string>;
  listTasks(planId: string): Promise<readonly LoopTask[]>;
  narrate(input: {
    readonly message: string;
    readonly taskId: string | undefined;
  }): Promise<void>;
  /** Opens a per-task work session declaring the model; returns its id. */
  startWorkSession(input: {
    readonly model: string | undefined;
    readonly planId: string;
    readonly taskId: string;
  }): Promise<string>;
  updatePlanStatus(input: {
    readonly planId: string;
    readonly status: LoopPlanStatus;
  }): Promise<void>;
  updateTask(input: {
    readonly status: LoopTaskStatus;
    readonly summary: string | undefined;
    readonly taskId: string;
  }): Promise<void>;
}

/** @public */
export interface LoopCancel {
  /** Durable cancel poll plus the in-memory signal. */
  isCancelled(): Promise<boolean>;
  readonly signal: AbortSignal;
}

/** @public */
export interface LoopClock {
  now(): number;
}

/** @public */
export interface LoopDeps {
  readonly cancel: LoopCancel;
  readonly client: LoopClient;
  readonly clock: LoopClock;
  readonly git: LoopGit;
  /** Routed model for a task (docs § 8); undefined declares no model. */
  readonly modelFor: (task: LoopTask) => string | undefined;
  readonly validator: LoopValidator;
  readonly worker: WorkerRunner;
}

/** @public */
export interface RunOtLoopOptions {
  readonly deps: LoopDeps;
  /** Default 2, clamped 0..5. */
  readonly maxRetries: number | undefined;
  readonly planId: string;
  /** Task-centric mode: only this task is selected and scoped for the close. */
  readonly taskId: string | undefined;
}

/**
 * @description What the loop reports; the caller maps it to finalize
 * (`workflow_complete` / `workflow_tasks_blocked`), cancelled, usage-limited or failed.
 * @public
 */
export type LoopOutcome =
  | { readonly kind: 'cancelled'; readonly taskId: string | undefined }
  | { readonly kind: 'complete'; readonly completedTaskIds: readonly string[] }
  | { readonly kind: 'failed'; readonly reason: string }
  | {
      readonly kind: 'tasks_blocked';
      readonly blockedTaskIds: readonly string[];
    }
  | { readonly kind: 'usage_limited'; readonly taskId: string };
