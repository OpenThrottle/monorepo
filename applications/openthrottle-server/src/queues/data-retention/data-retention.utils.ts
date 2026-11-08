import { DATA_RETENTION_DEFAULT_CRON_PATTERN } from './data-retention.constants.ts';
import type { DataRetentionConfig } from './data-retention.types.ts';

/**
 * @description Reads the retention config from the environment.
 *
 * Only the exact string `true` enables enforcement. Anything else — unset,
 * empty, `1`, `yes`, a typo — leaves the sweep in dry-run mode, so a
 * mis-set variable can never silently start deleting rows.
 */
export function resolveDataRetentionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DataRetentionConfig {
  return {
    cronPattern:
      env.DATA_RETENTION_CRON?.trim() || DATA_RETENTION_DEFAULT_CRON_PATTERN,
    enforce: env.DATA_RETENTION_ENFORCE?.trim().toLowerCase() === 'true',
    tz: env.DATA_RETENTION_TZ?.trim() || undefined,
  };
}
