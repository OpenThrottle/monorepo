import { join } from 'node:path';

const DEV_JSONL_FLAG = 'OT_SERVER_DEV_JSONL_LOGGING';
const DEV_JSONL_LOG_DIR = 'OT_SERVER_DEV_JSONL_LOG_DIR';

/**
 * @description Feature flag: register `@openthrottle/nestjs-logging` (JSONL + optional WS) for local
 * end-to-end checks. Off by default; do not enable in production without auth/review.
 */
export const isOpenthrottleServerDevJsonlLoggingEnabled = (): boolean => {
  const value = process.env[DEV_JSONL_FLAG];
  const isEnabled = value === 'true';

  console.log(
    '🤖 🤖 🤖 🤖 isOpenthrottleServerDevJsonlLoggingEnabled',
    value,
    isEnabled,
  );
  return isEnabled;
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
