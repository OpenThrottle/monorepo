import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { ProjectRunsModule } from '@openthrottle/nestjs-repositories-server';

import { ProjectRunAdvanceModule } from '../../services/project-run-advance/project-run-advance.module.ts';
import { ProjectRunsQueueProducerModule } from './producer/producer.module.ts';
import { ProjectRunsProcessor } from './project-runs.processor.ts';
import { ProjectRunsRepeatableService } from './repeatable/repeatable.service.ts';

/**
 * @description Processor half of the project-runs queue (WorkerHost + the reconcile repeatable).
 * Loaded only under PROCESS_ROLE worker/all, so an api-only process registers no orphan schedule.
 */
@Module({
  exports: [ProjectRunsQueueProducerModule],
  imports: [
    LoggerModule,
    ProjectRunAdvanceModule,
    ProjectRunsModule,
    ProjectRunsQueueProducerModule,
  ],
  providers: [ProjectRunsProcessor, ProjectRunsRepeatableService],
})
export class ProjectRunsQueueModule {}
