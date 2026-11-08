/**
 * @description Shared reliability options for repeatable (cron) BullMQ jobs.
 *
 * Repeatable jobs previously enqueued with only `{ repeat }`, so a failed run
 * was never retried and both completed and failed records accumulated in Redis
 * unbounded. These defaults add bounded retries with exponential backoff and
 * age-based cleanup of finished jobs.
 *
 * Note: BullMQ v5 removed the per-job `timeout` option; job-level timeouts are
 * enforced at the worker layer, so they are intentionally not set here.
 */

import type { JobsOptions } from 'bullmq';

/** Number of times a failed repeatable run is retried before being marked failed. */
const REPEATABLE_JOB_ATTEMPTS = 3;

/** Initial exponential-backoff delay (ms); doubles each attempt. */
const REPEATABLE_JOB_BACKOFF_DELAY_MS = 30_000;

/** Keep completed repeatable runs for 24h, capped at the 50 most recent. */
const REPEATABLE_JOB_REMOVE_ON_COMPLETE_AGE_SECONDS = 60 * 60 * 24;
const REPEATABLE_JOB_REMOVE_ON_COMPLETE_COUNT = 50;

/** Keep failed repeatable runs for 7d for debugging, capped at the 100 most recent. */
const REPEATABLE_JOB_REMOVE_ON_FAIL_AGE_SECONDS = 60 * 60 * 24 * 7;
const REPEATABLE_JOB_REMOVE_ON_FAIL_COUNT = 100;

/**
 * @description Default BullMQ job options applied to repeatable jobs: bounded
 * retries, exponential backoff, and age/count-based cleanup of completed and
 * failed records. Spread alongside the `repeat` option when registering a job.
 */
export const REPEATABLE_JOB_OPTIONS: JobsOptions = {
  attempts: REPEATABLE_JOB_ATTEMPTS,
  backoff: {
    delay: REPEATABLE_JOB_BACKOFF_DELAY_MS,
    type: 'exponential',
  },
  removeOnComplete: {
    age: REPEATABLE_JOB_REMOVE_ON_COMPLETE_AGE_SECONDS,
    count: REPEATABLE_JOB_REMOVE_ON_COMPLETE_COUNT,
  },
  removeOnFail: {
    age: REPEATABLE_JOB_REMOVE_ON_FAIL_AGE_SECONDS,
    count: REPEATABLE_JOB_REMOVE_ON_FAIL_COUNT,
  },
};
