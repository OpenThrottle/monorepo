import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ProjectRunsRepository } from '@openthrottle/nestjs-repositories-server';

import { ProjectRunAdvanceService } from '../../services/project-run-advance/project-run-advance.service.ts';
import { PROJECT_RUNS_QUEUE_NAME } from './project-runs.constants.ts';
import type { ProjectRunsJob } from './project-runs.types.ts';

const CONCURRENCY = 2;

/**
 * @description Worker for the project-runs queue. An advance job advances one project run; the
 * repeatable reconcile advances every active one. Both go through
 * {@link ProjectRunAdvanceService.advance}, which is idempotent and locks per run, so an advance
 * racing the reconcile (or a second worker) costs nothing but a `busy` no-op.
 */
@Processor(PROJECT_RUNS_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class ProjectRunsProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  constructor(
    private readonly logger: LoggerService,
    private readonly projectRunAdvance: ProjectRunAdvanceService,
    private readonly projectRunsRepository: ProjectRunsRepository,
  ) {
    super();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.worker.close();
  }

  async process(job: ProjectRunsJob): Promise<void> {
    if (job.data.kind === 'advance') {
      await this.advance(job.data.projectRunId);
      return;
    }

    const active = await this.projectRunsRepository.findActive();

    await Promise.all(
      active.map(async (run) => {
        return this.advance(run.id);
      }),
    );
  }

  private async advance(projectRunId: string): Promise<void> {
    const outcome = await this.projectRunAdvance.advance(projectRunId);

    if (outcome.kind === 'waiting' || outcome.kind === 'busy') {
      return;
    }

    this.logger.info(
      `Project run ${projectRunId} advanced: ${JSON.stringify(outcome)}`,
      ProjectRunsProcessor.name,
    );
  }
}
