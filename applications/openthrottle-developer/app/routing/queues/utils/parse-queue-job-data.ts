/**
 * @description Parses BullMQ job `data` JSON for plans-queue jobs (plan/task correlation).
 */

interface ParsedQueueJobData {
  /** Optional idempotency or trace id if the worker or client put it in the JSON payload. */
  readonly correlationId: string | undefined;
  readonly mode: string | undefined;
  readonly parseError: string | null;
  readonly planId: string | undefined;
  readonly prettyJson: string | null;
  readonly runKind: string | undefined;
  readonly taskId: string | undefined;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * @description Parses optional JSON job payload; surfaces copy-friendly formatting for operators.
 */
export const parseQueueJobDataString = (
  data: string | null | undefined,
): ParsedQueueJobData => {
  if (data == null || data === '') {
    return {
      correlationId: undefined,
      mode: undefined,
      parseError: null,
      planId: undefined,
      prettyJson: null,
      runKind: undefined,
      taskId: undefined,
    };
  }

  try {
    const parsed: unknown = JSON.parse(data);
    const record: Record<string, unknown> = isRecord(parsed) ? parsed : {};
    const planId =
      typeof record.planId === 'string' ? record.planId : undefined;
    const taskId =
      typeof record.taskId === 'string' ? record.taskId : undefined;
    const runKind =
      typeof record.runKind === 'string' ? record.runKind : undefined;
    const mode = typeof record.mode === 'string' ? record.mode : undefined;
    const correlationId =
      typeof record.correlationId === 'string'
        ? record.correlationId
        : undefined;

    return {
      correlationId,
      mode,
      parseError: null,
      planId,
      prettyJson: JSON.stringify(parsed, null, 2),
      runKind,
      taskId,
    };
  } catch {
    return {
      correlationId: undefined,
      mode: undefined,
      parseError: 'Invalid JSON',
      planId: undefined,
      prettyJson: data,
      runKind: undefined,
      taskId: undefined,
    };
  }
};
