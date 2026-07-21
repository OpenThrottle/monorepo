import { RUN_PLAN_ORCHESTRATOR_JOB_NAME } from '../agentic-ralph/agentic-ralph.constants';

export const PLANS_QUEUE_NAME = 'Plans';

/**
 * @description Historical BullMQ **job name** for the removed nested-`workflow-ralph` spawn path
 * (OT plan 2ab62876). No longer enqueued, but retained so cancellation/observability filters still
 * match any legacy `run-plan` jobs persisted in Redis, and so queue display can label them.
 */
export const RUN_PLAN_SPAWN_JOB_NAME = 'run-plan';

export { RUN_PLAN_ORCHESTRATOR_JOB_NAME };

/**
 * @description Job names on the plans queue that represent a Ralph/plan run (spawn or orchestrator).
 * Used for cancellation and observability filters.
 */
const PLAN_RALPH_BULL_JOB_NAMES = [
  RUN_PLAN_SPAWN_JOB_NAME,
  RUN_PLAN_ORCHESTRATOR_JOB_NAME,
] as const;

/**
 * @description True when `name` is a plan Ralph job type on the plans queue.
 */
export const isPlanRalphBullJobName = (
  name: string | null | undefined,
): boolean =>
  name != null && PLAN_RALPH_BULL_JOB_NAMES.some((jobName) => jobName === name);

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
const PLAN_JOB_PRIORITY = {
  BATCH: 100,
  INTERACTIVE: 1,
  NORMAL: 10,
} as const;

export const PLAN_JOB_PRIORITY_DEFAULT = PLAN_JOB_PRIORITY.NORMAL;

/**
 * @description Delay in milliseconds before retrying a job when all worktrees are locked.
 * When a job cannot acquire a worktree (all are busy), it is moved to delayed state and
 * retried after this delay. 30 seconds balances responsiveness with avoiding busy-waiting.
 */
export const WORKTREE_RETRY_DELAY_MS = 30_000;
