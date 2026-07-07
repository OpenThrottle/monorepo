/**
 * Registers an optional repeatable database-backup job on app bootstrap when enabled.
 * @see docs/openthrottle/database-backup-scheduled-job-spec.md
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
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
      // A rejected cron is a misconfiguration, not a normal opt-out — surface it
      // loudly so a bad DATABASE_BACKUP_CRON can't silently disable backups.
      if (schedule.invalid === true) {
        this.logger.warn(schedule.reason, DatabaseBackupRepeatableService.name);
      } else {
        this.logger.debug(
          schedule.reason,
          DatabaseBackupRepeatableService.name,
        );
      }

      return;
    }

    const repeatOptions = {
      pattern: schedule.cronPattern,
      ...(schedule.tz !== undefined ? { tz: schedule.tz } : {}),
    };

    // Keyed by the stable scheduler id, so changing the pattern REPLACES the
    // prior schedule instead of leaving a stale one behind. The legacy
    // queue.add({ repeat }) was keyed by pattern-hash, which let a bad
    // per-minute schedule coexist with the daily one (the 2026-07-05 flood).
    const job = await this.queue.upsertJobScheduler(
      schedule.repeatJobId,
      repeatOptions,
      {
        data: {},
        name: schedule.jobName,
        opts: REPEATABLE_JOB_OPTIONS,
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
