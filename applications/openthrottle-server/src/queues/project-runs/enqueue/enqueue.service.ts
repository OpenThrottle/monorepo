/**
 * @description Producer for the project-runs queue. Every path that settles a plan run calls it
 * AFTER the settle, so the project run that started the plan run (if any) takes its next step.
 * Best-effort: a failed enqueue is logged and swallowed, because a settle must never fail on Redis;
 * the repeatable reconcile sweep advances any project run whose trigger was lost.
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories-server';
import { PlanRunsRepository } from '@openthrottle/nestjs-repositories-server';
import { Queue } from 'bullmq';

import {
  PROJECT_RUN_ADVANCE_JOB_ID_PREFIX,
  PROJECT_RUN_ADVANCE_JOB_NAME,
  PROJECT_RUNS_QUEUE_NAME,
} from '../project-runs.constants.ts';
import type { ProjectRunsJobData } from '../project-runs.types.ts';

@Injectable()
export class ProjectRunsEnqueueService {
  constructor(
    private readonly logger: LoggerService,
    private readonly planRunsRepository: PlanRunsRepository,
    @InjectQueue(PROJECT_RUNS_QUEUE_NAME)
    private readonly queue: Queue<ProjectRunsJobData, void>,
  ) {}

  /**
   * @description Enqueues an advance of `projectRunId`, deduped on (project run, trigger): the same
   * settle delivered twice adds one job. Never throws.
   */
  async enqueueAdvance(projectRunId: string, trigger: string): Promise<void> {
    try {
      await this.queue.add(
        PROJECT_RUN_ADVANCE_JOB_NAME,
        { kind: 'advance', projectRunId },
        {
          jobId: `${PROJECT_RUN_ADVANCE_JOB_ID_PREFIX}${projectRunId}-${trigger}`,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue a project-run advance for ${projectRunId} (trigger ${trigger}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        ProjectRunsEnqueueService.name,
      );
    }
  }

  /**
   * @description Advances the project run behind a plan run that just settled; a plan run no
   * project run started (the common case) enqueues nothing. Never throws.
   */
  async enqueueAdvanceForPlanRun(
    planRun: Pick<PlanRun, 'id' | 'projectRunId' | 'status'> | null,
  ): Promise<void> {
    if (planRun?.projectRunId == null) {
      return;
    }

    await this.enqueueAdvance(
      planRun.projectRunId,
      `${planRun.id}-${planRun.status}`,
    );
  }

  /**
   * @description {@link enqueueAdvanceForPlanRun} for a settle that only knows the run by its
   * (queue, BullMQ job) key. Never throws.
   */
  async enqueueAdvanceForJob(
    queueName: string,
    bullmqJobId: string,
  ): Promise<void> {
    try {
      const planRun = await this.planRunsRepository.findOne({
        where: { bullmqJobId, queueName },
      });

      await this.enqueueAdvanceForPlanRun(planRun);
    } catch (error) {
      this.logger.warn(
        `Failed to look up the plan run for job ${bullmqJobId} to advance its project run: ${
          error instanceof Error ? error.message : String(error)
        }`,
        ProjectRunsEnqueueService.name,
      );
    }
  }
}
