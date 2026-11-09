/** What one boot recovery did, for the log line and for tests. */
export interface ScheduledAgentJobStuckRunRecoverySummary {
  readonly examined: number;
  readonly locksReleased: number;
  readonly recovered: number;
  readonly skippedLive: number;
}
