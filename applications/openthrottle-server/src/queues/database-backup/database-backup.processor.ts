/**
 * @description BullMQ processor for scheduled local Postgres backup via `pnpm run database:backup`.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  DATABASE_BACKUP_PNPM_SCRIPT,
  DATABASE_BACKUP_QUEUE_NAME,
  DATABASE_BACKUP_WORKER_LOCK_DURATION_MS,
} from './database-backup.constants';
import { getDatabaseBackupWorkspaceRoot } from './database-backup.env';
import { spawnDatabaseBackup } from './database-backup.spawn';
import type {
  DatabaseBackupJob,
  DatabaseBackupJobResult,
} from './database-backup.types';

const CONCURRENCY = 1;
const JOB_TYPE = 'database-backup';

/**
 * @description Processes database-backup jobs by spawning `pnpm run database:backup` at the monorepo root.
 */
@Processor(DATABASE_BACKUP_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
  lockDuration: DATABASE_BACKUP_WORKER_LOCK_DURATION_MS,
})
export class DatabaseBackupProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Database backup queue worker started (concurrency=${CONCURRENCY})`,
      DatabaseBackupProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Database backup queue worker shutting down (signal=${signal ?? 'unknown'})`,
      DatabaseBackupProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: DatabaseBackupJob): Promise<DatabaseBackupJobResult> {
    const { id: jobId } = job;
    const logContext = `${DatabaseBackupProcessor.name} [jobId=${jobId}]`;
    const workspaceRoot = getDatabaseBackupWorkspaceRoot();

    this.logger.info(
      `Database backup job started: cwd=${workspaceRoot}, script=${DATABASE_BACKUP_PNPM_SCRIPT}`,
      logContext,
    );

    const onStdout = (chunk: string): void => {
      this.logger.info(chunk.trimEnd(), logContext);
    };
    const onStderr = (chunk: string): void => {
      this.logger.warn(chunk.trimEnd(), logContext);
    };

    try {
      const exitCode = await spawnDatabaseBackup({
        cwd: workspaceRoot,
        onStderr,
        onStdout,
        script: DATABASE_BACKUP_PNPM_SCRIPT,
      });

      if (exitCode !== 0) {
        throw new Error(
          `${DATABASE_BACKUP_PNPM_SCRIPT} exited with code ${exitCode ?? 'signal'}`,
        );
      }

      const result: DatabaseBackupJobResult = {
        exitCode: exitCode ?? 0,
        workspaceRoot,
      };

      this.logger.info(
        `Database backup job finished: ${JSON.stringify(result)}`,
        logContext,
      );

      this.notifications.emitQueueJobCompleted({
        jobType: JOB_TYPE,
        message: `Database backup completed (job ${jobId})`,
        severity: 'success',
      });

      return result;
    } catch (error) {
      const message = `Database backup job failed: jobId=${jobId}, error=${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(message, logContext);
      this.notifications.emitQueueJobCompleted({
        jobType: JOB_TYPE,
        message: `Database backup failed: ${jobId}`,
        severity: 'error',
      });
      throw error;
    }
  }
}
