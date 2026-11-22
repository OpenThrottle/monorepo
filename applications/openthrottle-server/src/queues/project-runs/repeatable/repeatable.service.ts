import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';

import { REPEATABLE_JOB_OPTIONS } from '../../repeatable-job/repeatable-job.options.ts';
import { resolveRepeatablesOwner } from '../../repeatable-job/repeatable-job.utils.ts';
import {
  PROJECT_RUNS_QUEUE_NAME,
  PROJECT_RUNS_RECONCILE_JOB_NAME,
} from '../project-runs.constants.ts';
import type { ProjectRunsJobData } from '../project-runs.types.ts';

/**
 * @description Cron pattern: every minute at second 0 (sec min hour day month dow). The settle
 * triggers advance a project run within moments; this is only the backstop for a lost trigger or a
 * restart mid-run, so a minute of lag is fine.
 */
const CRON_PATTERN = '0 * * * * *';

/**
 * @description Registers the repeatable project-run reconcile on bootstrap. Owner-only, like every
 * repeatable: a shared-DB worktree running branch code must not advance the primary's runs.
 */
@Injectable()
export class ProjectRunsRepeatableService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    @InjectQueue(PROJECT_RUNS_QUEUE_NAME)
    private readonly queue: Queue<ProjectRunsJobData, void>,
  ) {}

  async onModuleInit(): Promise<void> {
    const ownership = resolveRepeatablesOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Project-runs reconcile repeatable job not registered: ${ownership.reason}`,
        ProjectRunsRepeatableService.name,
      );
      return;
    }

    const job = await this.queue.add(
      PROJECT_RUNS_RECONCILE_JOB_NAME,
      { kind: 'reconcile' },
      { ...REPEATABLE_JOB_OPTIONS, repeat: { pattern: CRON_PATTERN } },
    );
    this.logger.info(
      `Project-runs reconcile repeatable job registered: pattern=${CRON_PATTERN}, repeatJobKey=${job.repeatJobKey ?? 'n/a'}`,
      ProjectRunsRepeatableService.name,
    );
  }
}
