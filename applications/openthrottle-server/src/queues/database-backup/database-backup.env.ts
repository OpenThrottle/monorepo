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
  | {
      readonly enabled: false;
      /** True when skipped due to a bad/too-frequent cron (log loudly). */
      readonly invalid?: boolean;
      readonly reason: string;
    }
  | DatabaseBackupRepeatableConfig;

/**
 * @description Validates a database-backup cron pattern before it can register a
 * scheduler. Rejects malformed patterns (wrong field count / illegal chars) and,
 * critically, patterns that fire MORE THAN HOURLY — the 2026-07-05 incident was a
 * bare `0` (interpreted as second=0, all-wildcard => every minute). A safe backup
 * pattern must have a fixed seconds (6-field) and minutes field, so it fires at
 * most once per hour.
 */
export function validateBackupCronPattern(
  pattern: string,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const fields = pattern.trim().split(/\s+/);

  if (fields.length !== 5 && fields.length !== 6) {
    return {
      ok: false,
      reason: `expected a 5- or 6-field cron pattern, got ${fields.length} field(s)`,
    };
  }

  const cronFieldPattern = /^[0-9*/,\-A-Za-z?]+$/;
  for (const field of fields) {
    if (!cronFieldPattern.test(field)) {
      return {
        ok: false,
        reason: `illegal characters in cron field "${field}"`,
      };
    }
  }

  const isFixedValue = (value: string): boolean =>
    /^\d{1,2}$/.test(value) && Number(value) >= 0 && Number(value) <= 59;

  const hasSeconds = fields.length === 6;
  const secondsField = hasSeconds ? fields[0] : '0';
  const minutesField = hasSeconds ? fields[1] : fields[0];

  if (!isFixedValue(secondsField)) {
    return {
      ok: false,
      reason: `seconds field "${secondsField}" must be a fixed value (0-59); wildcards/steps/lists fire sub-minute`,
    };
  }

  if (!isFixedValue(minutesField)) {
    return {
      ok: false,
      reason: `minutes field "${minutesField}" must be a fixed value (0-59); this pattern fires more than hourly`,
    };
  }

  return { ok: true };
}

/**
 * @description Decides whether THIS checkout owns scheduled backups. Multiple
 * openthrottle-server instances share one Redis; without a single owner each
 * worktree registers its own scheduler (a factor in the 2026-07-05 flood). An
 * explicit `OT_BACKUP_OWNER` wins; otherwise a checkout running from under a
 * `*worktrees/` directory (the `~/.openthrottle/worktrees` default and the historical sibling
 * `openthrottle-worktrees` alike) is treated as a non-owner.
 */
export function resolveBackupOwnership(
  workspaceRoot: string,
):
  | { readonly owner: true }
  | { readonly owner: false; readonly reason: string } {
  const explicit = process.env.OT_BACKUP_OWNER;
  if (explicit !== undefined && explicit.trim() !== '') {
    return parseTruthyEnv(explicit)
      ? { owner: true }
      : {
          owner: false,
          reason: `OT_BACKUP_OWNER is false; this checkout does not schedule backups.`,
        };
  }

  if (/[/\\][^/\\]*worktrees[/\\]/.test(workspaceRoot)) {
    return {
      owner: false,
      reason: `workspace root ${workspaceRoot} is a worktree checkout; only the canonical checkout schedules backups (set OT_BACKUP_OWNER=true to override).`,
    };
  }

  return { owner: true };
}

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
 *
 * ENABLED vs CRON are distinct switches: to DISABLE backups set
 * `DATABASE_BACKUP_ENABLED=false`. `DATABASE_BACKUP_CRON` is ONLY a schedule and
 * must be a valid, at-most-hourly cron pattern — a bad value (e.g. the bare `0`
 * from the 2026-07-05 incident) is REJECTED and skips registration; it never
 * silently means "disable" or "every minute".
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

  const cronValidation = validateBackupCronPattern(cronTrimmed);
  if (!cronValidation.ok) {
    return {
      enabled: false,
      invalid: true,
      reason: `DATABASE_BACKUP_CRON="${cronTrimmed}" rejected: ${cronValidation.reason}. Use an at-most-hourly pattern (e.g. "0 0 0 * * *"); to disable backups set DATABASE_BACKUP_ENABLED=false.`,
    };
  }

  const workspaceRoot = getDatabaseBackupWorkspaceRoot();
  const ownership = resolveBackupOwnership(workspaceRoot);
  if (!ownership.owner) {
    return { enabled: false, reason: ownership.reason };
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
    workspaceRoot,
  };
}
