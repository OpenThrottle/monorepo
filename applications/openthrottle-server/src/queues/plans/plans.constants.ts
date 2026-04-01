export const PLANS_QUEUE_NAME = 'plans';

/**
 * Worker options for stalled-job recovery after server restart.
 * Ralph runs can be long; lock is renewed every lockDuration/2. After restart, the lock expires
 * and the job becomes stalled, then is moved back to waiting within ~lockDuration + stalledInterval.
 */
export const PLANS_WORKER_LOCK_DURATION_MS = 300_000; // 5 min; renewal every 2.5 min
export const PLANS_WORKER_MAX_STALLED_COUNT = 1; // move back to waiting when stalled (retry)
export const PLANS_WORKER_STALLED_INTERVAL_MS = 60_000; // check for stalled jobs every 60s

/**
 * @description Job priority levels for BullMQ. Lower numbers = higher priority (processed first).
 * BullMQ uses a priority queue where jobs with lower priority values are dequeued before higher values.
 */
export const PLAN_JOB_PRIORITY = {
  BATCH: 100,
  INTERACTIVE: 1,
  NORMAL: 10,
} as const;

export type PlanJobPriority =
  (typeof PLAN_JOB_PRIORITY)[keyof typeof PLAN_JOB_PRIORITY];

export const PLAN_JOB_PRIORITY_DEFAULT = PLAN_JOB_PRIORITY.NORMAL;

/**
 * @description Delay in milliseconds before retrying a job when all worktrees are locked.
 * When a job cannot acquire a worktree (all are busy), it is moved to delayed state and
 * retried after this delay. 30 seconds balances responsiveness with avoiding busy-waiting.
 */
export const WORKTREE_RETRY_DELAY_MS = 30_000;
