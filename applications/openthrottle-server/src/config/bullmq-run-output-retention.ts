import { getBullMqRunOutputBaseDirectory } from './bullmq-run-output';

const MAX_AGE_MS_ENV = 'BULLMQ_RUN_OUTPUT_MAX_AGE_MS';
const MAX_TOTAL_BYTES_ENV = 'BULLMQ_RUN_OUTPUT_MAX_TOTAL_BYTES';
const PRUNE_MIN_INTERVAL_MS_ENV = 'BULLMQ_RUN_OUTPUT_PRUNE_MIN_INTERVAL_MS';

const DEFAULT_PRUNE_MIN_INTERVAL_MS = 300_000;

const parsePositiveIntegerEnv = (
  raw: string | undefined,
): number | undefined => {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();

  if (trimmed === '') {
    return undefined;
  }

  const n = Number(trimmed);

  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return undefined;
  }

  return n;
};

export interface BullMqRunOutputRetentionConfig {
  readonly baseDirectory: string;
  readonly maxAgeMs?: number;
  readonly maxTotalBytes?: number;
  readonly minIntervalMs: number;
}

/**
 * @description When `BULLMQ_RUN_OUTPUT_DIR` is set and at least one of max-age or max-total-bytes is set,
 * post-job throttled pruning may run (see {@link BullMqRunOutputRetentionService}).
 */
export const getBullMqRunOutputRetentionConfig = ():
  BullMqRunOutputRetentionConfig | undefined => {
  const baseDirectory = getBullMqRunOutputBaseDirectory();

  if (baseDirectory === undefined) {
    return undefined;
  }

  const maxAgeMs = parsePositiveIntegerEnv(process.env[MAX_AGE_MS_ENV]);
  const maxTotalBytes = parsePositiveIntegerEnv(
    process.env[MAX_TOTAL_BYTES_ENV],
  );

  if (maxAgeMs === undefined && maxTotalBytes === undefined) {
    return undefined;
  }

  const minIntervalMs =
    parsePositiveIntegerEnv(process.env[PRUNE_MIN_INTERVAL_MS_ENV]) ??
    DEFAULT_PRUNE_MIN_INTERVAL_MS;

  return {
    baseDirectory,
    maxAgeMs,
    maxTotalBytes,
    minIntervalMs,
  };
};
