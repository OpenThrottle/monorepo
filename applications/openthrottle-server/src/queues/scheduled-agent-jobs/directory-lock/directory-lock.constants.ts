/**
 * Lock TTL. Deliberately far SHORTER than a run (runs default to 15m), because the TTL is the only
 * thing that frees a directory abandoned by a killed worker — a TTL sized to cover the longest run
 * would block that directory for the same span. The heartbeat below is what keeps a live run's lock
 * from expiring under it.
 */
export const SCHEDULED_AGENT_JOB_LOCK_TTL_MS = 30_000;

/** Renewal cadence — a third of the TTL, so two consecutive missed beats still do not expire a lock. */
export const SCHEDULED_AGENT_JOB_LOCK_RENEW_MS = 10_000;
