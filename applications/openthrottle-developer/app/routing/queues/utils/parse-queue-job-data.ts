/**
 * @description Parses BullMQ job `data` JSON for plans-queue jobs (plan/task correlation).
 */

import { isRecord } from '@openthrottle/nodejs-utils';

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

const readOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  return undefined;
};

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
    const planId = readOptionalString(record.planId);
    const taskId = readOptionalString(record.taskId);
    const runKind = readOptionalString(record.runKind);
    const mode = readOptionalString(record.mode);
    const correlationId = readOptionalString(record.correlationId);

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
