/**
 * @description Environment contract for the scheduled database-backup BullMQ queue.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */

import {
  DATABASE_BACKUP_JOB_NAME,
  DATABASE_BACKUP_PNPM_SCRIPT,
  DATABASE_BACKUP_REPEATABLE_JOB_ID,
} from './database-backup.constants';

/** @description BullMQ cron: daily at 00:00:00 (UTC when DATABASE_BACKUP_TZ is unset). */
export const DATABASE_BACKUP_DEFAULT_CRON_PATTERN = '0 0 0 * * *';

/** @description Default BullMQ job timeout (30 minutes). */
export const DATABASE_BACKUP_DEFAULT_JOB_TIMEOUT_MS = 1_800_000;

export interface DatabaseBackupRepeatableConfig {
  readonly cronPattern: string;
  readonly enabled: true;
  readonly jobName: typeof DATABASE_BACKUP_JOB_NAME;
  readonly jobTimeoutMs: number;
  readonly pnpmScript: typeof DATABASE_BACKUP_PNPM_SCRIPT;
  readonly repeatJobId: typeof DATABASE_BACKUP_REPEATABLE_JOB_ID;
  readonly tz: string | undefined;
  readonly workspaceRoot: string;
}

export type DatabaseBackupScheduleResolution =
  | { readonly enabled: false; readonly reason: string }
  | DatabaseBackupRepeatableConfig;

export function parseTruthyEnv(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  return !['0', 'false', 'no', 'off'].includes(normalized);
}

export function parsePositiveIntEnv(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

/**
 * @description Resolves monorepo root for `pnpm run database:backup`. Matches doc-ingestion and plans processors.
 */
export function getDatabaseBackupWorkspaceRoot(): string {
  const root = process.env.WORKSPACE_ROOT?.trim();

  return root && root.length > 0 ? root : process.cwd();
}

/**
 * @description Whether scheduled database backup should register on bootstrap.
 */
export function resolveDatabaseBackupSchedule(): DatabaseBackupScheduleResolution {
  const cronRaw = process.env.DATABASE_BACKUP_CRON;
  const cronTrimmed = cronRaw?.trim() ?? '';

  if (!parseTruthyEnv(process.env.DATABASE_BACKUP_ENABLED)) {
    return {
      enabled: false,
      reason: `DATABASE_BACKUP_ENABLED is false; skipping repeatable database-backup registration.`,
    };
  }

  if (cronTrimmed === '') {
    return {
      enabled: false,
      reason: `DATABASE_BACKUP_CRON not set; skipping repeatable database-backup registration.`,
    };
  }

  const tzRaw = process.env.DATABASE_BACKUP_TZ?.trim();
  const tz = tzRaw && tzRaw.length > 0 ? tzRaw : undefined;

  return {
    cronPattern: cronTrimmed,
    enabled: true,
    jobName: DATABASE_BACKUP_JOB_NAME,
    jobTimeoutMs: parsePositiveIntEnv(
      process.env.DATABASE_BACKUP_JOB_TIMEOUT_MS,
      DATABASE_BACKUP_DEFAULT_JOB_TIMEOUT_MS,
    ),
    pnpmScript: DATABASE_BACKUP_PNPM_SCRIPT,
    repeatJobId: DATABASE_BACKUP_REPEATABLE_JOB_ID,
    tz,
    workspaceRoot: getDatabaseBackupWorkspaceRoot(),
  };
}
