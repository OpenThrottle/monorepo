import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options';
import { WORK_LEDGER_SWEEP_QUEUE_NAME } from './work-ledger-sweep.constants';
import type { WorkLedgerSweepJobData } from './work-ledger-sweep.types';

/** @description Cron pattern: hourly at minute 0 (sec min hour day month dow). */
const CRON_PATTERN = '0 0 * * * *';

const JOB_NAME = 'Sweep Abandoned Work Sessions';

/**
 * @description Registers the repeatable abandoned-session sweep on app bootstrap.
 */
@Injectable()
export class WorkLedgerSweepRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(WORK_LEDGER_SWEEP_QUEUE_NAME)
    private readonly queue: Queue<WorkLedgerSweepJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const job = await this.queue.add(
      JOB_NAME,
      {},
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Work-ledger sweep repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      WorkLedgerSweepRepeatableService.name,
    );
  }
}
