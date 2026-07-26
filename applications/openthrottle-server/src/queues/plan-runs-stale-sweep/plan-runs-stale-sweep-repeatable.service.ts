import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options';
import { PLAN_RUNS_STALE_SWEEP_QUEUE_NAME } from './plan-runs-stale-sweep.constants';
import type { PlanRunsStaleSweepJobData } from './plan-runs-stale-sweep.types';

/**
 * @description Cron pattern: every minute at second 0 (sec min hour day month dow). The passive
 * reader already makes the UX honest instantly; the sweeper's job is the durable settle + plan
 * reconcile, so ~1-min lag is fine and the indexed cutoff scan is cheap.
 */
const CRON_PATTERN = '0 * * * * *';

const JOB_NAME = 'Sweep Stale Plan Runs';

/**
 * @description Registers the repeatable stale-plan-run sweep on app bootstrap.
 */
@Injectable()
export class PlanRunsStaleSweepRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(PLAN_RUNS_STALE_SWEEP_QUEUE_NAME)
    private readonly queue: Queue<PlanRunsStaleSweepJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const job = await this.queue.add(
      JOB_NAME,
      {},
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Plan-runs stale sweep repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      PlanRunsStaleSweepRepeatableService.name,
    );
  }
}
