/**
 * Worker options for stalled-job recovery after server restart.
 * Ralph runs can be long; lock is renewed every lockDuration/2. After restart, the lock expires
 * and the job becomes stalled, then is moved back to waiting within ~lockDuration + stalledInterval.
 */
export const WORKER_LOCK_DURATION_MS = 300_000; // 5 min; renewal every 2.5 min
export const WORKER_MAX_STALLED_COUNT = 1; // move back to waiting when stalled (retry)
export const WORKER_STALLED_INTERVAL_MS = 60_000; // check for stalled jobs every 60s

/**
 * @description Job priority levels for BullMQ. Lower numbers = higher priority (processed first).
 * BullMQ uses a priority queue where jobs with lower priority values are dequeued before higher values.
 */
export const WORKFLOW_JOB_PRIORITY = {
  BATCH: 100,
  INTERACTIVE: 1,
  NORMAL: 10,
} as const;

export const WORKFLOW_NAME = 'Workflow (v2)';

/**
 * @description BullMQ **job name** for in-process Ralph via `createWorkflowRalphOrchestrator`
 * ({@link RunPlanOrchestratorJobData}). Same {@link PLANS_QUEUE_NAME} queue as spawn jobs; discriminated by
 * name + payload `runKind`.
 */
export const WORKFLOW_ORCHESTRATOR_JOB_NAME = `${WORKFLOW_NAME}:orchestrator-job`;

/**
 * @description BullMQ **job name** for spawn plan runs (nested `workflow-ralph`). Same string as historical
 * GraphQL enqueue; use this in `queue.add` for {@link RunPlanSpawnJobData}.
 */
export const WORKFLOW_SPAWN_JOB_NAME = `${WORKFLOW_NAME}:spawn-job`;

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
