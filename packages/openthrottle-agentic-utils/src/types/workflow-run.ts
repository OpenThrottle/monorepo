/**
 * Align structured logs using `correlationId` (and optionally `queueJobId`,
 * `queueName`) so aggregators can join with queue metrics such as `WORKFLOW_EVENT`.
 */
export interface WorkflowCorrelation {
  /** Primary key for cross-service correlation (often a BullMQ job id or generated run id). */
  readonly correlationId: string;

  /** Queue-backed job identifier when applicable (may match {@link WorkflowCorrelation.correlationId}). */
  readonly queueJobId?: string;

  /** Logical queue name (e.g. BullMQ queue name) for log filtering. */
  readonly queueName?: string;
}
