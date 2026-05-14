import { Inject, Injectable } from '@nestjs/common';
import type { WorkflowRunCorrelation } from '@openthrottle/nestjs-agentic-workflow';
import { AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS } from '@openthrottle/nestjs-agentic-workflow';
import {
  buildRalphFlowContextFromPlanRunTuning,
  createWorkflowRalphOrchestrator,
} from '@openthrottle/openthrottle-agentic-ralph';
import type {
  WorkflowContext,
  WorkflowRalphOrchestratorDeps,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-ralph';
import type { RunPlanOrchestratorJobData } from './agentic-ralph.types';

type PlanRunTuningInput = NonNullable<
  Parameters<typeof buildRalphFlowContextFromPlanRunTuning>[0]['ralph']
>;

/**
 * @description In-process Ralph for the `plans` queue: injects {@link AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS}
 * from {@link AgenticRalphModule} with {@link createWorkflowRalphOrchestrator} from
 * `@openthrottle/openthrottle-agentic-ralph` (not the legacy `@openthrottle/openthrottle-workflows` orchestrator).
 */
@Injectable()
export class AgenticRalphOrchestratorService {
  constructor(
    @Inject(AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS)
    private readonly ralphOrchestratorDeps: WorkflowRalphOrchestratorDeps,
  ) {}

  /**
   * @description Runs one orchestrator job: GraphQL-backed pipeline with iteration runner chosen by
   * `executionBackend` / tuning (`cursor` or `claude`).
   */
  async runPlanOrchestratorJob(params: {
    readonly correlation?: WorkflowRunCorrelation;
    readonly jobData: RunPlanOrchestratorJobData;
    readonly signal?: AbortSignal;
  }): Promise<WorkflowRunResult> {
    const { correlation, jobData, signal } = params;
    const orchestrator = createWorkflowRalphOrchestrator(
      this.ralphOrchestratorDeps,
    );

    const baseContext = buildRalphFlowContextFromPlanRunTuning({
      executionBackend: jobData.executionBackend,
      mode: jobData.mode ?? 'plan',
      planId: jobData.planId,
      ralph: jobData.ralph as PlanRunTuningInput | undefined,
      taskId: jobData.taskId,
    });

    const context: WorkflowContext = {
      ...baseContext,
      ...(signal !== undefined ? { abortSignal: signal } : {}),
      ...(correlation !== undefined ? { correlation } : {}),
    };

    return orchestrator.execute({ context });
  }
}
