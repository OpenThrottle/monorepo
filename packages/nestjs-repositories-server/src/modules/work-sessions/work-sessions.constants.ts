/**
 * @description How a work session was closed. Mirrors `chk_work_sessions_closed_by`
 * (databases/openthrottle/migrations 068, 113). An `as const` object, per repo code style.
 * @public
 */
export const WORK_SESSION_CLOSED_BY = {
  /** Closed by endWorkSession after real work — the session records a span. */
  EXPLICIT: 'explicit',
  /**
   * Instantaneous by nature: a single first-party mutation with no span to record
   * (started_at = ended_at). Distinct from EXPLICIT so "does this session have a
   * duration" is a value in the data, not an ended_at = started_at comparison.
   */
  INSTANT: 'instant',
  /** Closed by the hourly abandoned-session sweeper, 24h after the session started. */
  SWEEPER: 'sweeper',
} as const;

export type WorkSessionClosedByKey = keyof typeof WORK_SESSION_CLOSED_BY;
export type WorkSessionClosedByValue =
  (typeof WORK_SESSION_CLOSED_BY)[WorkSessionClosedByKey];
