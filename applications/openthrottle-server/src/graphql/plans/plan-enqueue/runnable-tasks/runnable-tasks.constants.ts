/** Task statuses reset to QUEUED when a plan run is enqueued (COMPLETED and PROMOTED tasks are left unchanged: PROMOTED work continued as its own plan, so re-running it here would duplicate it). */
export const ENQUEUE_TASK_STATUSES_TO_RESET = [
  'PENDING',
  'IN_PROGRESS',
  'BLOCKED',
  'BACKLOG',
  'SKIPPED',
  'CANCELED',
] as const;

/** Task statuses a whole-plan run would pick up: every resettable status plus tasks already QUEUED. */
export const RUNNABLE_TASK_STATUSES = [
  ...ENQUEUE_TASK_STATUSES_TO_RESET,
  'QUEUED',
] as const;
