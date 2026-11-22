import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlanRunsModule,
  PlansModule,
  ProjectRunsModule,
  RepositoriesModule,
  RepositoryCheckoutsModule,
  WorkArtifactsModule,
  WorkSessionsModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanEnqueueModule } from '../../graphql/plans/plan-enqueue/plan-enqueue.module.ts';
import { PlanStatusModule } from '../../graphql/plans/plan-status/plan-status.module.ts';
import { ProjectRunAdvanceService } from './project-run-advance.service.ts';

/**
 * @description Provides {@link ProjectRunAdvanceService}, the project-run state machine, to the
 * project-runs worker and the GraphQL mutations that start and cancel a project run.
 */
@Module({
  exports: [ProjectRunAdvanceService],
  imports: [
    LoggerModule,
    PlanEnqueueModule,
    PlanRunsModule,
    PlansModule,
    PlanStatusModule,
    ProjectRunsModule,
    RepositoriesModule,
    RepositoryCheckoutsModule,
    WorkArtifactsModule,
    WorkSessionsModule,
  ],
  providers: [ProjectRunAdvanceService],
})
export class ProjectRunAdvanceModule {}
