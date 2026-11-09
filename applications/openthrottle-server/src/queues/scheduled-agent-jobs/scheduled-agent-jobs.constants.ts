import type { JobsOptions } from 'bullmq';

import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job/repeatable-job.options.ts';
/** Human-readable Bull Board queue name (matches `Database Backup`). */
export const SCHEDULED_AGENT_JOBS_QUEUE_NAME = 'Scheduled Agent Jobs';

/** Stable BullMQ job name / processor + logging identifier. */
export const SCHEDULED_AGENT_JOB_NAME = 'scheduled-agent-job';

/** Prefix of every scheduler id this feature owns (`scheduled-job:<uuid>`). */
export const SCHEDULED_AGENT_JOB_SCHEDULER_PREFIX = 'scheduled-job:';

/**
 * Job options for scheduled/run-now fires. **`attempts: 1`** — agent prompts are non-idempotent and
 * expensive, and driver failures resolve (never throw) so a BullMQ retry would only fire on a
 * processor exception, producing duplicate run rows sharing one `bullmq_job_id`. Keep only the
 * age/count cleanup from {@link REPEATABLE_JOB_OPTIONS}; drop its `attempts`/`backoff`.
 */
export const SCHEDULED_AGENT_JOB_OPTIONS: JobsOptions = {
  attempts: 1,
  removeOnComplete: REPEATABLE_JOB_OPTIONS.removeOnComplete,
  removeOnFail: REPEATABLE_JOB_OPTIONS.removeOnFail,
};

/**
 * Default worker concurrency, now that overlap is made safe by a KEY rather than by a number.
 *
 * The historical value was 1 for one reason: two agent CLIs in the same cwd fight over the git index.
 * Per-repository targeting (`repository_checkout_id`) made >1 *conceivable* — two schedules pointing
 * at different checkouts share no git index — but not sufficient on its own, because two schedules can
 * still target the SAME checkout. What makes >1 safe is
 * {@link resolveScheduledAgentJobConcurrencyKey} plus the advisory directory lock the processor takes
 * on that key: independent directories overlap freely, and any two runs that would land in the same
 * directory serialise regardless of how each of them named it.
 *
 * Read via {@link resolveScheduledAgentJobsConcurrency} so it stays env-tunable. NOTE the lock lives in
 * Redis: with `REDIS_HOST` unset there is no lock, so such a deployment should pin the env back to 1.
 */
export const SCHEDULED_AGENT_JOBS_DEFAULT_CONCURRENCY = 4;

/** Fallback per-run timeout (15m) when a schedule sets no `timeout_ms`. */
export const SCHEDULED_AGENT_JOBS_DEFAULT_TIMEOUT_MS = 15 * 60_000;

/** Run-output source tag for JSONL attribution (the agent CLI's own stdout/stderr). */
export const SCHEDULED_AGENT_JOB_OUTPUT_SOURCE = 'agent';
/** Namespace prefix of every advisory directory-lock key this feature takes. */
export const SCHEDULED_AGENT_JOBS_LOCK_KEY_PREFIX = 'scheduled-agent-jobs:dir:';
