/**
 * @description Fixed, greppable marker prefixing every log line written when a writer's work-ledger
 * capture failed but its status write was allowed to commit anyway (a non-fatal
 * `captureFailureIsFatal: false` capture — every background/bulk writer). Deliberately a single
 * unpunctuated token so an alert can match it exactly: these lines are the only evidence that a
 * status transition happened without a ledger row, and nothing else surfaces them until the
 * agreement script in databases/reports is next run.
 *
 * Lives in its own module — rather than on {@link PlanStatusService}, which re-exports it so
 * existing imports keep working — so the bulk task-status writers
 * ({@link applyBulkTaskStatusChange}) can log the same marker without a circular import back
 * through the plan-status chokepoint (`plan-status.service.ts` already imports the bulk-task-status
 * helper for `cancelRun`).
 */
export const WORK_LEDGER_CAPTURE_FAILED_MARKER = 'WORK_LEDGER_CAPTURE_FAILED';
