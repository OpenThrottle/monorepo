/**
 * @description Default BullMQ Worker options for job recovery after server restart.
 * Queues that use these (or extend them) get stalled-job detection: after a restart,
 * active jobs become stalled when the lock expires and re-enter the waiting queue.
 *
 * Use in @Processor(queueName, { ...defaultWorkerOptionsdefaultWorkerOptionsdefaultWorkerOptions, concurrency: 1 }).
 * Plans queue uses longer lockDuration via its own constants; other queues can import these.
 */

/** Lock TTL in Redis (ms). Worker renews every lockDuration/2. After process exit, lock expires and job can be detected as stalled. */
export const DEFAULT_LOCK_DURATION_MS = 60_000;

/** How often (ms) the worker checks for stalled jobs. */
export const DEFAULT_STALLED_INTERVAL_MS = 30_000;

/** When a job is detected stalled, move back to waiting (retry). After this many stalls it moves to failed. */
export const DEFAULT_MAX_STALLED_COUNT = 1;

/**
 * @description Default Worker options for stalled-job recovery. Spread into @Processor options.
 */
export const defaultWorkerOptions = {
  lockDuration: DEFAULT_LOCK_DURATION_MS,
  maxStalledCount: DEFAULT_MAX_STALLED_COUNT,
  stalledInterval: DEFAULT_STALLED_INTERVAL_MS,
} as const;
