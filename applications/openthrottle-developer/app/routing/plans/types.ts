export const planStatusValues = {
  BACKLOG: 'Backlog',
  BLOCKED: 'Blocked',
  CANCELED: 'Canceled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SKIPPED: 'Skipped',
} as const;

export type PlanStatusKey = keyof typeof planStatusValues;
