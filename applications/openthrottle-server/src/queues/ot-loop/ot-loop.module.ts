import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  PlanRunsModule,
  PlanTagsModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanRunWorkspaceModule } from '../../services/plan-run-workspace/plan-run-workspace.module.ts';
import { OtLoopOrchestratorService } from './orchestrator/orchestrator.service.ts';
import { otLoopExecuteGraphqlProvider } from './ot-loop-execute-graphql.provider.ts';

/**
 * @description Nest wiring for the OT Loop runner (docs/workflows/ot-loop-job.md). It runs on the
 * `Plans` queue under the `'Plan Run'` job name; `PlansProcessor` hands every job to
 * {@link OtLoopOrchestratorService}. Imported by `PlansQueueModule`.
 */
@Module({
  exports: [OtLoopOrchestratorService],
  imports: [
    LoggerModule,
    PlanRunsModule,
    PlanRunWorkspaceModule,
    PlanTagsModule,
  ],
  providers: [OtLoopOrchestratorService, otLoopExecuteGraphqlProvider],
})
export class OtLoopModule {}
