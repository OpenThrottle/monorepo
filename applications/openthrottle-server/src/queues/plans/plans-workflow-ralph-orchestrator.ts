/**
 * @description In-process Ralph orchestrator wiring for the plans queue: server-side GraphQL
 * (`executeGraphqlV2` + workflow env) and the same Cursor iteration runner as `workflow-ralph`
 * (`createCursorWorkflowRalphIterationRunner` from `@tools/workflows`). Used when {@link RunPlanOrchestratorJobData.runKind}
 * is `orchestrator`.
 */
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { ExecuteGraphqlOptionsV2 } from '@openthrottle/nodejs-graphql';
import { executeGraphqlV2 } from '@openthrottle/nodejs-graphql';
import {
  buildRalphFlowContextFromPlanRunTuning,
  buildWorkflowExecuteGraphqlV2Options,
  createWorkflowRalphOrchestrator,
} from '@openthrottle/openthrottle-workflows';
import type {
  WorkflowExecuteGraphqlV2,
  WorkflowRalphOrchestratorDeps,
  LegacyWorkflowResult,
  WorkflowRalphContext,
} from '@openthrottle/openthrottle-workflows';
import { createCursorWorkflowRalphIterationRunner } from '@tools/workflows';
import type { RunPlanOrchestratorJobData } from './plans.types';
import { resolvePlansWorkerWorkflowGraphqlConfigFromEnv } from './worker-graphql-auth';

type PlanRunTuningInput = NonNullable<
  Parameters<typeof buildRalphFlowContextFromPlanRunTuning>[0]['ralph']
>;

/**
 * @description Binds {@link executeGraphqlV2} with {@link resolvePlansWorkerWorkflowGraphqlConfigFromEnv} so
 * the BullMQ worker always merges worker-scoped GraphQL credentials (env + optional non-production placeholder).
 */
const createPlansQueueWorkflowExecuteGraphqlV2 =
  (): WorkflowExecuteGraphqlV2 => {
    const options = buildWorkflowExecuteGraphqlV2Options(
      resolvePlansWorkerWorkflowGraphqlConfigFromEnv(),
    );

    return async <TData, TVariables extends Record<string, unknown>>(
      document: TypedDocumentNode<TData, TVariables>,
      variables?: TVariables,
      overrideOptions?: ExecuteGraphqlOptionsV2,
    ): Promise<TData> =>
      executeGraphqlV2(document, variables, { ...options, ...overrideOptions });
  };

/**
 * @description GraphQL executor + iteration runner for {@link createWorkflowRalphOrchestrator}.
 */
export const createPlansQueueWorkflowRalphOrchestratorDeps =
  (): WorkflowRalphOrchestratorDeps => ({
    executeGraphqlV2: createPlansQueueWorkflowExecuteGraphqlV2(),
    iterationRunner: createCursorWorkflowRalphIterationRunner(),
  });

/**
 * @description Runs the GraphQL-backed Ralph orchestrator for a single plans-queue orchestrator job.
 * Optional `signal` is the same AbortSignal the plans worker registers so `cancelPlanRun` stops iterations.
 */
export const runPlanOrchestratorJob = async (params: {
  readonly jobData: RunPlanOrchestratorJobData;
  readonly signal?: AbortSignal;
}): Promise<LegacyWorkflowResult> => {
  const { jobData, signal } = params;
  const orchestrator = createWorkflowRalphOrchestrator(
    createPlansQueueWorkflowRalphOrchestratorDeps(),
  );

  const baseContext = buildRalphFlowContextFromPlanRunTuning({
    mode: jobData.mode ?? 'plan',
    planId: jobData.planId,
    ralph: jobData.ralph as PlanRunTuningInput | undefined,
    taskId: jobData.taskId,
  });

  const context: WorkflowRalphContext = {
    ...baseContext,
    ...(signal !== undefined ? { abortSignal: signal } : {}),
  };

  return orchestrator.execute({ context });
};
