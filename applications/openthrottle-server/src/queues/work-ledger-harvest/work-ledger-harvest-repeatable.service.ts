import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';

import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options.ts';
import { WORK_LEDGER_HARVEST_QUEUE_NAME } from './work-ledger-harvest.constants.ts';
import type { WorkLedgerHarvestJobData } from './work-ledger-harvest.types.ts';

/**
 * @description Cron pattern: hourly, on the hour (sec min hour day month dow).
 *
 * Hourly rather than the verifier's 15 minutes: nothing downstream needs sub-hour latency on a
 * merged commit, and the settle-time path already covers the fast case. This is the backstop.
 */
const CRON_PATTERN = '0 0 * * * *';

const JOB_NAME = 'Harvest Work Ledger Trailers';

/**
 * @description Registers the repeatable work-ledger harvest sweep on app bootstrap.
 */
@Injectable()
export class WorkLedgerHarvestRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(WORK_LEDGER_HARVEST_QUEUE_NAME)
    private readonly queue: Queue<WorkLedgerHarvestJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const job = await this.queue.add(
      JOB_NAME,
      {},
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Work-ledger harvest repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      WorkLedgerHarvestRepeatableService.name,
    );
  }
}
