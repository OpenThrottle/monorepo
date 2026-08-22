import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options';
import {
  DATA_RETENTION_JOB_NAME,
  DATA_RETENTION_QUEUE_NAME,
  DATA_RETENTION_REPEATABLE_JOB_ID,
} from './data-retention.constants';
import { resolveDataRetentionConfig } from './data-retention.env';
import type { DataRetentionJobData } from './data-retention.types';

/**
 * @description Registers the repeatable data-retention sweep on app bootstrap.
 *
 * Daily rather than hourly: retention windows are measured in months, so there is
 * nothing for an hourly run to do, and a nightly slot keeps the bulk deletes away
 * from interactive traffic.
 *
 * The schedule is registered whether or not enforcement is on. In dry-run mode the
 * job still runs and reports what it would delete, which is exactly the signal an
 * operator needs before enabling it.
 */
@Injectable()
export class DataRetentionRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(DATA_RETENTION_QUEUE_NAME)
    private readonly queue: Queue<DataRetentionJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const { cronPattern, enforce, tz } = resolveDataRetentionConfig();

    const job = await this.queue.add(
      DATA_RETENTION_JOB_NAME,
      {},
      {
        ...REPEATABLE_JOB_OPTIONS,
        jobId: DATA_RETENTION_REPEATABLE_JOB_ID,
        repeat: { pattern: cronPattern, ...(tz ? { tz } : {}) },
      },
    );

    this.logger.info(
      `Data-retention repeatable job registered: pattern=${cronPattern}, tz=${tz ?? 'UTC'}, mode=${enforce ? 'ENFORCING' : 'dry-run'}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      DataRetentionRepeatableService.name,
    );
  }
}
