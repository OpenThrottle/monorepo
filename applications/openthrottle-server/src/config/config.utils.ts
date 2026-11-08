import { join } from 'node:path';

import { PROCESS_ROLES } from './config.constants.ts';
import type { BullMqRunOutputRetentionConfig } from './config.types.ts';
import type { ProcessRole } from './config.types.ts';
const isProcessRole = (value: string): value is ProcessRole => {
  return value in PROCESS_ROLES;
};

/**
 * @description Resolves PROCESS_ROLE from the environment. Unset/blank
 * defaults to `all`; anything else invalid fails fast at bootstrap rather than
 * silently running with the wrong module graph.
 */
export const resolveProcessRole = (): ProcessRole => {
  const raw = process.env.PROCESS_ROLE?.trim().toLowerCase();

  if (!raw) {
    return PROCESS_ROLES.all;
  }

  if (!isProcessRole(raw)) {
    throw new Error(
      `Invalid PROCESS_ROLE "${raw}". Expected one of: ${Object.keys(
        PROCESS_ROLES,
      ).join(', ')}.`,
    );
  }

  return raw;
};
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

const DEFAULT_PRUNE_MIN_INTERVAL_MS = 300_000;

const PRUNE_MIN_INTERVAL_MS_ENV = 'BULLMQ_RUN_OUTPUT_PRUNE_MIN_INTERVAL_MS';

const MAX_TOTAL_BYTES_ENV = 'BULLMQ_RUN_OUTPUT_MAX_TOTAL_BYTES';

const MAX_AGE_MS_ENV = 'BULLMQ_RUN_OUTPUT_MAX_AGE_MS';

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
const RUN_OUTPUT_DIR_ENV = 'BULLMQ_RUN_OUTPUT_DIR';

/**
 * @description When set to a non-empty string, plan/workflow BullMQ workers append Ralph spawn
 * stdout/stderr to per-job JSONL under this directory via `KeyedJsonlWriter` from `@openthrottle/nestjs-logging`.
 */
export const getBullMqRunOutputBaseDirectory = (): string | undefined => {
  const raw = process.env[RUN_OUTPUT_DIR_ENV];

  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();

  return trimmed === '' ? undefined : trimmed;
};
const DEV_JSONL_LOG_DIR = 'OT_SERVER_DEV_JSONL_LOG_DIR';

const DEV_JSONL_FLAG = 'OT_SERVER_DEV_JSONL_LOGGING';

/**
 * @description Feature flag: register `@openthrottle/nestjs-logging` (JSONL + optional WS) for local
 * end-to-end checks. Off by default; do not enable in production without auth/review.
 */
export const isOpenthrottleServerDevJsonlLoggingEnabled = (): boolean => {
  const value = process.env[DEV_JSONL_FLAG];

  return value === 'true';
};

/**
 * @description Absolute or cwd-relative directory for JSONL files when the dev flag is on.
 */
export const getOpenthrottleServerDevJsonlLogDirectory = (): string => {
  const fromEnv = process.env[DEV_JSONL_LOG_DIR];

  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return fromEnv.trim();
  }

  return join(process.cwd(), '.openthrottle', 'server-logs');
};
