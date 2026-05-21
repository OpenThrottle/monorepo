/**
 * @description Types for the scheduled database-backup BullMQ job.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */

import type { Job } from 'bullmq';

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
