/** The smallest misfire threshold a job may set: below this, ordinary queue jitter trips it. */
export const SCHEDULED_AGENT_JOB_MISFIRE_MIN_THRESHOLD_MS = 60_000;

/** Default misfire threshold (T3 Code skips fixed-time runs more than 10 minutes late). */
export const SCHEDULED_AGENT_JOB_MISFIRE_DEFAULT_THRESHOLD_MS = 10 * 60_000;

/** How far back the boot reconcile looks for missed slots; older ones are not worth a row. */
export const SCHEDULED_AGENT_JOB_MISFIRE_LOOKBACK_MS = 7 * 24 * 60 * 60_000;

/** At most this many missed slots are recorded per job per boot (the most recent ones). */
export const SCHEDULED_AGENT_JOB_MISSED_RECORD_LIMIT = 50;
