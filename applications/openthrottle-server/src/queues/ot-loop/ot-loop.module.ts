import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanRunWorkspaceModule } from '../../services/plan-run-workspace/plan-run-workspace.module.ts';
import { OtLoopOrchestratorService } from './orchestrator/orchestrator.service.ts';
import { otLoopExecuteGraphqlProvider } from './ot-loop-execute-graphql.provider.ts';

/**
 * @description Nest wiring for the OT Loop runner (docs/workflows/ot-loop-job.md). It runs on the
 * `Plans` queue under Ralph's job name; `PlansProcessor` dispatches to
 * {@link OtLoopOrchestratorService} on `jobData.runner === 'ot-loop'`. Imported by `PlansQueueModule`.
 */
@Module({
  exports: [OtLoopOrchestratorService],
  imports: [LoggerModule, NestjsRepositoriesModule, PlanRunWorkspaceModule],
  providers: [OtLoopOrchestratorService, otLoopExecuteGraphqlProvider],
})
export class OtLoopModule {}
