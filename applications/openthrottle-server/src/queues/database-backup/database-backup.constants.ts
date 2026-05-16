/** @description BullMQ queue display name (Bull Board, GraphQL queueName). */
export const DATABASE_BACKUP_QUEUE_NAME = 'Database Backup';

/** @description Stable job name for processor and repeatable registration. */
export const DATABASE_BACKUP_JOB_NAME = 'database-backup';

/**
 * @description Stable BullMQ jobId for the repeatable scheduler so redeploys upsert one schedule.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */
export const DATABASE_BACKUP_REPEATABLE_JOB_ID =
  'openthrottle-database-backup-repeatable';

/** @description Root package.json script invoked by the processor. */
export const DATABASE_BACKUP_PNPM_SCRIPT = 'database:backup';
