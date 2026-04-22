import { Module } from '@nestjs/common';
import {
  AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
  AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS,
  AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
  NestjsAgenticWorkflowModule,
} from '@openthrottle/nestjs-agentic-workflow';
import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import { buildWorkflowExecuteGraphqlV2Options } from '@openthrottle/openthrottle-agentic-ralph';
import { createAgenticRalphOrchestratorDeps } from './agentic-ralph-orchestrator-deps.factory';
import { AgenticRalphOrchestratorService } from './agentic-ralph-orchestrator.service';
import { resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv } from './agentic-ralph-worker-graphql-auth';

/**
 * @description Nest wiring for in-process Ralph on the server: `NestjsAgenticWorkflowModule` (worker GraphQL
 * auth + `executeGraphqlV2`), Ralph orchestrator deps, and {@link AgenticRalphOrchestratorService}. Imported by
 * `PlansQueueModule` so the plans worker stays the single BullMQ consumer while Ralph-specific DI lives here.
 */
@Module({
  exports: [AgenticRalphOrchestratorService],
  imports: [
    NestjsAgenticWorkflowModule.register({
      executeGraphqlV2,
      workerGraphqlAuth: buildWorkflowExecuteGraphqlV2Options(
        resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv(),
      ),
    }),
  ],
  providers: [
    AgenticRalphOrchestratorService,
    {
      inject: [
        AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
        AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
      ],
      provide: AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS,
      useFactory: createAgenticRalphOrchestratorDeps,
    },
  ],
})
export class AgenticRalphModule {}
