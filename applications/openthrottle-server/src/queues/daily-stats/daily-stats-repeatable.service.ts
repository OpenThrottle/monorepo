import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { DAILY_STATS_QUEUE_NAME } from './daily-stats.constants';
import type { AggregateDailyStatsJobData } from './daily-stats.types';

/** @description Cron pattern for 6am UTC daily (sec min hour day month dow). */
const CRON_PATTERN = '0 0 6 * * *';

const JOB_NAME = 'Aggregate Daily Stats';

/**
 * @description Registers the repeatable daily stats job on app bootstrap.
 */
@Injectable()
export class DailyStatsRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(DAILY_STATS_QUEUE_NAME)
    private readonly queue: Queue<AggregateDailyStatsJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const job = await this.queue.add(
      JOB_NAME,
      {},
      { repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Daily stats repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      DailyStatsRepeatableService.name,
    );
  }
}
