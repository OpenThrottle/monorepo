/**
 * @description Parses BullMQ job `data` JSON for plans-queue jobs (plan/task correlation).
 */

export interface ParsedQueueJobData {
  readonly mode: string | undefined;
  readonly parseError: string | null;
  readonly planId: string | undefined;
  readonly prettyJson: string | null;
  readonly runKind: string | undefined;
  readonly taskId: string | undefined;
}

/**
 * @description Parses optional JSON job payload; surfaces copy-friendly formatting for operators.
 */
export const parseQueueJobDataString = (
  data: string | null | undefined,
): ParsedQueueJobData => {
  if (data == null || data === '') {
    return {
      mode: undefined,
      parseError: null,
      planId: undefined,
      prettyJson: null,
      runKind: undefined,
      taskId: undefined,
    };
  }

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const planId =
      typeof parsed.planId === 'string' ? parsed.planId : undefined;
    const taskId =
      typeof parsed.taskId === 'string' ? parsed.taskId : undefined;
    const runKind =
      typeof parsed.runKind === 'string' ? parsed.runKind : undefined;
    const mode = typeof parsed.mode === 'string' ? parsed.mode : undefined;

    return {
      mode,
      parseError: null,
      planId,
      prettyJson: JSON.stringify(parsed, null, 2),
      runKind,
      taskId,
    };
  } catch {
    return {
      mode: undefined,
      parseError: 'Invalid JSON',
      planId: undefined,
      prettyJson: data,
      runKind: undefined,
      taskId: undefined,
    };
  }
};
