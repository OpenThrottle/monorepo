import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { ForeignSkillInjectionLifecycleService } from '../../services/foreign-skill-injection/foreign-skill-injection-lifecycle.service';
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
 * @description Registers the repeatable stale-plan-run sweep on app bootstrap, and rides that same
 * boot lifecycle to reap any foreign-skill layer stranded in a consumer repo by a prior server/run
 * that crashed before its shutdown teardown (no bespoke marker system — the per-repo ledgers ARE the
 * markers). Boot-once, before any run of this server materializes a layer, so it only ever removes
 * genuinely stranded layers.
 */
@Injectable()
export class PlanRunsStaleSweepRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(PLAN_RUNS_STALE_SWEEP_QUEUE_NAME)
    private readonly queue: Queue<PlanRunsStaleSweepJobData, void>,
    private readonly logger: LoggerService,
    private readonly foreignSkillInjectionLifecycle: ForeignSkillInjectionLifecycleService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Crash recovery for foreign-skill injection, riding the stale-sweep boot lifecycle.
    this.foreignSkillInjectionLifecycle.reapStrandedLedgers();

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
