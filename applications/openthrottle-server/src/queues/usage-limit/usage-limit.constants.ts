/**
 * @description Usage-limit auto-resume policy (see `decideUsageLimitResume`), shared by the plans queue and the scheduled-agent-jobs queue. A run that stops on a
 * Claude subscription limit is continued automatically only when the reset is near enough to be
 * worth holding a delayed job for, and only a bounded number of times.
 */

/** Reset times further out than this (a weekly window, typically) are not auto-resumed. */
export const USAGE_LIMIT_RESUME_MAX_HORIZON_MS = 24 * 60 * 60 * 1_000;

/**
 * A reset that is already this far in the past is treated as an unreliable signal rather than "the
 * limit has just lifted", and the run is held instead of resumed.
 */
export const USAGE_LIMIT_RESUME_PAST_TOLERANCE_MS = 15 * 60 * 1_000;

/** Safety margin added after the reported reset so the resume does not race the window opening. */
export const USAGE_LIMIT_RESUME_BUFFER_MS = 60_000;

/**
 * Auto-resume stops once a continuation chain contains this many USAGE_LIMITED runs (the run that
 * just stopped included), so a plan that keeps hitting the limit cannot loop forever.
 */
export const USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH = 3;

/** BullMQ jobId prefix for a continuation job; the limited run's id follows. Hyphens only. Used by both the plans and scheduled-agent-jobs queues; each queue has its own job-id namespace, so the shared prefix cannot collide. */
export const USAGE_LIMIT_RESUME_JOB_ID_PREFIX = 'usage-limit-resume-';
