import { Module } from '@nestjs/common';
import {
  AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
  AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS,
  AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
  AgenticWorkflowRalph,
  NestjsAgenticWorkflowModule,
} from '@openthrottle/nestjs-agentic-workflow';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import { buildWorkflowExecuteGraphqlV2Options } from '@openthrottle/openthrottle-agentic-ralph';
import type { WorkflowRalphOrchestratorDeps } from '@openthrottle/openthrottle-agentic-ralph';
import { ForeignSkillInjectionModule } from '../../services/foreign-skill-injection/foreign-skill-injection.module';
import { PlanRunWorktreeCheckoutModule } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.module';
import { createAgenticRalphOrchestratorDeps } from './agentic-ralph-orchestrator-deps.factory';
import { AgenticRalphOrchestratorService } from './agentic-ralph-orchestrator.service';
import { resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv } from './agentic-ralph-worker-graphql-auth';

/**
 * @description Nest wiring for in-process Ralph on the server. Registers the Ralph workflow into the
 * agentic-workflow registry via `NestjsAgenticWorkflowModule.registerWorkflow`: worker GraphQL auth +
 * `executeGraphqlV2`, the Ralph orchestrator deps token, and an {@link AgenticWorkflowRalph} entry keyed
 * by {@link AGENTIC_WORKFLOW_RALPH_ID} (`'ralph'`). The {@link AgenticRalphOrchestratorService} resolves
 * the workflow through the registry by id (behavior-neutral indirection: id `'ralph'` yields exactly
 * `createWorkflowRalphOrchestrator(deps)`). Imported by `PlansQueueModule` so the plans worker stays the
 * single BullMQ consumer while Ralph-specific DI lives here.
 */
@Module({
  exports: [AgenticRalphOrchestratorService],
  imports: [
    LoggerModule,
    NestjsAgenticWorkflowModule.registerWorkflow({
      executeGraphqlV2,
      providers: [
        {
          inject: [
            AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
            AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
          ],
          provide: AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS,
          useFactory: createAgenticRalphOrchestratorDeps,
        },
      ],
      workerGraphqlAuth: buildWorkflowExecuteGraphqlV2Options(
        resolveAgenticRalphWorkerWorkflowGraphqlConfigFromEnv(),
      ),
      workflows: [
        {
          inject: [AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS],
          useFactory: (deps: WorkflowRalphOrchestratorDeps) =>
            new AgenticWorkflowRalph(deps),
        },
      ],
    }),
    ForeignSkillInjectionModule,
    NestjsRepositoriesModule,
    PlanRunWorktreeCheckoutModule,
  ],
  providers: [AgenticRalphOrchestratorService],
})
export class AgenticRalphModule {}
