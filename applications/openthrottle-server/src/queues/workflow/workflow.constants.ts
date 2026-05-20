/**
 * Worker options for stalled-job recovery after server restart.
 * Ralph runs can be long; lock is renewed every lockDuration/2. After restart, the lock expires
 * and the job becomes stalled, then is moved back to waiting within ~lockDuration + stalledInterval.
 */
export const WORKER_LOCK_DURATION_MS = 300_000; // 5 min; renewal every 2.5 min
export const WORKER_MAX_STALLED_COUNT = 1; // move back to waiting when stalled (retry)
export const WORKER_STALLED_INTERVAL_MS = 60_000; // check for stalled jobs every 60s

export const WORKFLOW_NAME = 'Workflow (v2)';

/**
 * @description Delay in milliseconds before retrying a job when all worktrees are locked.
 * When a job cannot acquire a worktree (all are busy), it is moved to delayed state and
 * retried after this delay. 30 seconds balances responsiveness with avoiding busy-waiting.
 */
export const WORKTREE_RETRY_DELAY_MS = 30_000;

/**
 * How long to wait after SIGTERM before SIGKILL when stopping Ralph
 * (matches tools/workflows child-job).
 */
export const WORKFLOW_SIGKILL_GRACE_MS = 10_000;
