import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';

import { PLAN_RUN_WORKTREE_REAPER_DRY_RUN_ENV } from '../../services/plan-run-worktree-reaper/plan-run-worktree-reaper.constants.ts';
import { PlanRunWorktreeReaperService } from '../../services/plan-run-worktree-reaper/plan-run-worktree-reaper.service.ts';
import { isPlanRunWorktreeReaperDryRun } from '../../services/plan-run-worktree-reaper/plan-run-worktree-reaper.utils.ts';
import { resolveRepeatablesOwner } from '../repeatable-job.owner.ts';
import { PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME } from './plan-run-worktree-reaper.constants.ts';
import type { PlanRunWorktreeReaperJob } from './plan-run-worktree-reaper.types.ts';

const CONCURRENCY = 1;

/**
 * @description Runs one backstop sweep of plan-run worktrees per scheduled tick (see
 * PlanRunWorktreeReaperService). Owner-only twice over: the repeatable is registered only by the
 * owning server, and a tick that reaches a non-owner worker — a shared-DB worktree running branch
 * code against shared Redis — is skipped, because that server must never remove the user's
 * worktrees. Dry-run unless `OPENTHROTTLE_WORKTREE_REAPER_DRY_RUN` is explicitly false.
 */
@Processor(PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class PlanRunWorktreeReaperProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly logger: LoggerService,
    private readonly reaper: PlanRunWorktreeReaperService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Plan-run worktree reaper worker started (concurrency=${CONCURRENCY})`,
      PlanRunWorktreeReaperProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Plan-run worktree reaper worker shutting down (signal=${signal ?? 'unknown'})`,
      PlanRunWorktreeReaperProcessor.name,
    );
    await this.worker.close();
  }

  async process(job: PlanRunWorktreeReaperJob): Promise<void> {
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Plan-run worktree reaper tick ${job.id ?? 'n/a'} skipped: ${ownership.reason}`,
        PlanRunWorktreeReaperProcessor.name,
      );
      return;
    }

    const dryRun = isPlanRunWorktreeReaperDryRun(
      process.env[PLAN_RUN_WORKTREE_REAPER_DRY_RUN_ENV],
    );
    const summary = await this.reaper.sweep({ dryRun, now: new Date() });

    this.logger.info(
      `Plan-run worktree reaper done: dryRun=${dryRun}, examined=${summary.examined}, nominated=${summary.nominated.length}, removed=${summary.removed}, deferred=${summary.deferred}`,
      PlanRunWorktreeReaperProcessor.name,
    );
  }
}
