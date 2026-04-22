import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Inject, Injectable } from '@nestjs/common';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import {
  AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2,
  AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH,
} from '@openthrottle/nestjs-agentic-workflow';
import type {
  AgenticWorkflowExecuteGraphqlV2,
  AgenticWorkflowWorkerGraphqlAuth,
} from '@openthrottle/nestjs-agentic-workflow';
import {
  buildRalphFlowContextFromPlanRunTuning,
  createWorkflowRalphOrchestrator,
} from '@openthrottle/openthrottle-agentic-ralph';
import type {
  WorkflowContext,
  WorkflowExecuteGraphqlV2,
  WorkflowRalphOrchestratorDeps,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-ralph';
import { createCursorWorkflowRalphIterationRunner } from '@tools/workflows';
import type { RunPlanOrchestratorJobData } from './plans.types';

type PlanRunTuningInput = NonNullable<
  Parameters<typeof buildRalphFlowContextFromPlanRunTuning>[0]['ralph']
>;

/**
 * @description In-process Ralph for the plans queue: binds injected worker GraphQL auth with
 * {@link createWorkflowRalphOrchestrator} from `@openthrottle/openthrottle-agentic-ralph` (not the
 * legacy `@openthrottle/openthrottle-workflows` orchestrator).
 */
@Injectable()
export class PlansRalphOrchestratorService {
  constructor(
    @Inject(AGENTIC_WORKFLOW_EXECUTE_GRAPHQL_V2)
    private readonly executeGraphqlV2: AgenticWorkflowExecuteGraphqlV2,
    @Inject(AGENTIC_WORKFLOW_WORKER_GRAPHQL_AUTH)
    private readonly workerGraphqlAuth: AgenticWorkflowWorkerGraphqlAuth,
  ) {}

  /**
   * @description Runs one orchestrator job: GraphQL-backed pipeline with Cursor iteration runner.
   */
  async runPlanOrchestratorJob(params: {
    readonly jobData: RunPlanOrchestratorJobData;
    readonly signal?: AbortSignal;
  }): Promise<WorkflowRunResult> {
    const { jobData, signal } = params;
    const orchestrator = createWorkflowRalphOrchestrator(
      this.createOrchestratorDeps(),
    );

    const baseContext = buildRalphFlowContextFromPlanRunTuning({
      mode: jobData.mode ?? 'plan',
      planId: jobData.planId,
      ralph: jobData.ralph as PlanRunTuningInput | undefined,
      taskId: jobData.taskId,
    });

    const context: WorkflowContext = {
      ...baseContext,
      ...(signal !== undefined ? { abortSignal: signal } : {}),
    };

    return orchestrator.execute({ context });
  }

  private createBoundExecuteGraphqlV2(): WorkflowExecuteGraphqlV2 {
    return async <TData, TVariables extends Record<string, unknown>>(
      document: TypedDocumentNode<TData, TVariables>,
      variables?: TVariables,
      overrideOptions?: ExecuteGraphqlOptionsV2,
    ): Promise<TData> =>
      this.executeGraphqlV2(document, variables, {
        ...this.workerGraphqlAuth,
        ...overrideOptions,
      });
  }

  private createOrchestratorDeps(): WorkflowRalphOrchestratorDeps {
    return {
      executeGraphqlV2: this.createBoundExecuteGraphqlV2(),
      iterationRunner: createCursorWorkflowRalphIterationRunner(),
    };
  }
}
