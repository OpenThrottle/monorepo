/**
 * BullMQ queue display name (Bull Board, GraphQL queueName).
 */
export const DATABASE_BACKUP_QUEUE_NAME = 'Database Backup';

/**
 * Stable job name for processor and repeatable registration.
 */
export const DATABASE_BACKUP_JOB_NAME = 'database-backup';

/**
 * Stable BullMQ jobId for the repeatable scheduler so redeploys upsert one schedule.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */
export const DATABASE_BACKUP_REPEATABLE_JOB_ID = `openthrottle-database-backup-repeatable`;

/**
 * Root package.json script invoked by the processor.
 */
export const DATABASE_BACKUP_PNPM_SCRIPT = 'database:backup';

/**
 * Worker lock for long `pg_dump` runs; renewed every lockDuration/2 while processing.
 * Aligns with default job timeout (30 min) in database-backup.env.
 */
export const DATABASE_BACKUP_WORKER_LOCK_DURATION_MS = 1_800_000;
