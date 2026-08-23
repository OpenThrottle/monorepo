/**
 * @description Environment contract for the data-retention sweep.
 *
 * Enforcement is OPT-IN. With `DATA_RETENTION_ENFORCE` unset the sweep runs in
 * dry-run mode: it counts what each policy would remove, logs it, and deletes
 * nothing. Retention deletes are irreversible and the rows in question are real
 * plan history, so the default has to be the safe one — an operator reads a few
 * dry-run reports, agrees with the numbers, and only then turns it on.
 *
 * That also makes this deployable ahead of the decision: the policies and their
 * measured impact land now, the deleting starts when someone says so.
 */

/** BullMQ cron: daily at 03:30:00 (UTC unless DATA_RETENTION_TZ is set). */
export const DATA_RETENTION_DEFAULT_CRON_PATTERN = '0 30 3 * * *';

export interface DataRetentionConfig {
  /** Cron pattern for the repeatable sweep. */
  readonly cronPattern: string;
  /** When false, the sweep counts and reports but never deletes. */
  readonly enforce: boolean;
  /** Timezone for the cron pattern; undefined means UTC. */
  readonly tz: string | undefined;
}

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
