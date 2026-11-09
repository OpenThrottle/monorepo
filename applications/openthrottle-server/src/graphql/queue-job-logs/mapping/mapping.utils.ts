import { QUEUE_JOB_LOG_LEVELS } from './mapping.constants.ts';
import type {
  QueueJobLogLevel,
  QueueJobLogSourceRecord,
} from './mapping.types.ts';
const isQueueJobLogLevel = (value: unknown): value is QueueJobLogLevel => {
  return (
    typeof value === 'string' &&
    QUEUE_JOB_LOG_LEVELS.some((level) => level === value)
  );
};

/**
 * @description Derive a severity bucket. Keyed run lines carry no native level, so:
 * prefer an explicit recognized `level` on structured `data`; otherwise map by
 * stream `type` (`meta → debug`, `stdout → info`, `stderr → warn`). `stderr` is
 * NOT blanket-mapped to `error` — many tools write normal progress to stderr — so
 * `error` only surfaces from an explicit structured `level: "error"`.
 */
export const deriveQueueJobLogLevel = (
  record: QueueJobLogSourceRecord,
): QueueJobLogLevel => {
  if (typeof record.data !== 'string') {
    const level = record.data.level;
    if (isQueueJobLogLevel(level)) {
      return level;
    }
  }

  switch (record.type) {
    case 'stderr':
      return 'warn';
    case 'meta':
      return 'debug';
    default:
      return 'info';
  }
};

/**
 * @description Extract a human-readable message: a string `data` is trimmed; an
 * object `data` prefers its `message`/`msg` string field, else its JSON. The
 * result is still subject to redaction (task 6) before being returned/published.
 */
export const extractQueueJobLogMessage = (
  data: string | Readonly<Record<string, unknown>>,
): string => {
  if (typeof data === 'string') {
    return data.trim();
  }

  const candidate = data.message ?? data.msg;
  if (typeof candidate === 'string') {
    return candidate;
  }

  return JSON.stringify(data);
};
