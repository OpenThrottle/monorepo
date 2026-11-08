/**
 * @description Types for the scheduled database-backup BullMQ job.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */
import type { Job } from 'bullmq';

import type {
  DATABASE_BACKUP_JOB_NAME,
  DATABASE_BACKUP_PNPM_SCRIPT,
  DATABASE_BACKUP_REPEATABLE_JOB_ID,
} from './database-backup.constants.ts';

/** @description Repeatable and manual backup jobs use an empty payload; env drives behavior. */
export interface DatabaseBackupJobPayload {
  readonly triggeredAt?: string;
}

/**
 * @description Return value of the database-backup job for API/UI display.
 */
export interface DatabaseBackupJobResult {
  readonly exitCode: number;
  readonly workspaceRoot: string;
}

/** BullMQ job type for the database-backup queue. */
export type DatabaseBackupJob = Job<
  DatabaseBackupJobPayload,
  DatabaseBackupJobResult
>;
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
