/**
 * @description The statuses that mean a run is *in flight* — not yet terminal. The single
 * definition shared by the repository layer, the GraphQL surface, and the processor, so "in
 * flight" cannot drift.
 * @public
 */
export const SCHEDULED_AGENT_JOB_RUN_IN_FLIGHT_STATUSES = [
  'queued',
  'running',
] as const;
