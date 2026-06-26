/**
 * Registers an optional repeatable database-backup job on app bootstrap when enabled.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { JobsOptions, Queue } from 'bullmq';
import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options';
import { DATABASE_BACKUP_QUEUE_NAME } from './database-backup.constants';
import { resolveDatabaseBackupSchedule } from './database-backup.env';
import type {
  DatabaseBackupJobPayload,
  DatabaseBackupJobResult,
} from './database-backup.types';

/**
 * Registers the repeatable database-backup job on app bootstrap when env enables it.
 */
@Injectable()
export class DatabaseBackupRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(DATABASE_BACKUP_QUEUE_NAME)
    private readonly queue: Queue<
      DatabaseBackupJobPayload,
      DatabaseBackupJobResult
    >,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const schedule = resolveDatabaseBackupSchedule();
    if (!schedule.enabled) {
      this.logger.debug(schedule.reason, DatabaseBackupRepeatableService.name);

      return;
    }

    const repeat: JobsOptions['repeat'] = {
      pattern: schedule.cronPattern,
      ...(schedule.tz !== undefined ? { tz: schedule.tz } : {}),
    };

    const job = await this.queue.add(
      schedule.jobName,
      {},
      {
        ...REPEATABLE_JOB_OPTIONS,
        jobId: schedule.repeatJobId,
        repeat,
      },
    );

    const tzValue = schedule.tz !== undefined ? schedule.tz : 'UTC';
    const tzSuffix = `, tz=${tzValue}`;
    const pattern = `${schedule.cronPattern}${tzSuffix}`;

    this.logger.info(
      `Database-backup repeatable job registered: pattern=${pattern}, jobId=${schedule.repeatJobId}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}, workspaceRoot=${schedule.workspaceRoot}`,
      DatabaseBackupRepeatableService.name,
    );
  }
}
