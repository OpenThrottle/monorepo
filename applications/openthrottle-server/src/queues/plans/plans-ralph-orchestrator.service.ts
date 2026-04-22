import { Inject, Injectable } from '@nestjs/common';
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
import type { RunPlanOrchestratorJobData } from './plans.types';

type PlanRunTuningInput = NonNullable<
  Parameters<typeof buildRalphFlowContextFromPlanRunTuning>[0]['ralph']
>;

/**
 * @description In-process Ralph for the plans queue: injects {@link AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS}
 * from the plans queue Nest module with {@link createWorkflowRalphOrchestrator} from
 * `@openthrottle/openthrottle-agentic-ralph` (not the legacy `@openthrottle/openthrottle-workflows`
 * orchestrator).
 */
@Injectable()
export class PlansRalphOrchestratorService {
  constructor(
    @Inject(AGENTIC_WORKFLOW_RALPH_ORCHESTRATOR_DEPS)
    private readonly ralphOrchestratorDeps: WorkflowRalphOrchestratorDeps,
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
      this.ralphOrchestratorDeps,
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
}
