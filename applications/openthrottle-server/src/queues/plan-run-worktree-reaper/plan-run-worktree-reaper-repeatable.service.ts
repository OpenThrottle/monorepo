import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';

import { REPEATABLE_JOB_OPTIONS } from '../repeatable-job.options.ts';
import { resolveRepeatablesOwner } from '../repeatable-job.owner.ts';
import { PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME } from './plan-run-worktree-reaper.constants.ts';
import type { PlanRunWorktreeReaperJobData } from './plan-run-worktree-reaper.types.ts';

/**
 * @description Cron pattern: every 30 minutes at second 0 (sec min hour day month dow). The
 * reaper is a disk backstop with a 7-day age floor; reclaiming within half an hour is plenty, and
 * each tick shells out to git and gh per plan-run worktree.
 */
const CRON_PATTERN = '0 */30 * * * *';

const JOB_NAME = 'Reap Plan Run Worktrees';

/**
 * @description Registers the repeatable plan-run worktree sweep on boot — owner-only, because it
 * removes directories from the user's real worktree root (see `repeatable-job.owner.ts`).
 */
@Injectable()
export class PlanRunWorktreeReaperRepeatableService implements OnModuleInit {
  constructor(
    @InjectQueue(PLAN_RUN_WORKTREE_REAPER_QUEUE_NAME)
    private readonly queue: Queue<PlanRunWorktreeReaperJobData, void>,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Plan-run worktree reaper repeatable job not registered: ${ownership.reason}`,
        PlanRunWorktreeReaperRepeatableService.name,
      );
      return;
    }

    const job = await this.queue.add(
      JOB_NAME,
      {},
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Plan-run worktree reaper repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      PlanRunWorktreeReaperRepeatableService.name,
    );
  }
}
