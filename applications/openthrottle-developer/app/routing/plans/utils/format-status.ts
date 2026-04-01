/**
 * @description Maps plan/task status enum (uppercase) to a display label for the UI.
 */
const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  BLOCKED: 'Blocked',
  CANCELED: 'Canceled',
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In progress',
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SKIPPED: 'Skipped',
};

/**
 * @description Returns a human-readable label for a plan/task status (e.g. IN_PROGRESS → "In progress"). Falls back to the raw value if unknown.
 */
export function formatPlanTaskStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
