import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options';
import { WORK_LEDGER_VERIFY_QUEUE_NAME } from './work-ledger-verify.constants';
import type { WorkLedgerVerifyJobData } from './work-ledger-verify.types';

/** @description Cron pattern: every 15 minutes (sec min hour day month dow). */
const CRON_PATTERN = '0 */15 * * * *';

const JOB_NAME = 'Verify Work Ledger Artifacts';

/**
 * @description Registers the repeatable work-ledger verification sweep on app bootstrap.
 */
@Injectable()
export class WorkLedgerVerifyRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(WORK_LEDGER_VERIFY_QUEUE_NAME)
    private readonly queue: Queue<WorkLedgerVerifyJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const job = await this.queue.add(
      JOB_NAME,
      {},
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Work-ledger verify repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      WorkLedgerVerifyRepeatableService.name,
    );
  }
}
