import { Inject, Injectable } from '@nestjs/common';
import type { AgenticWorkflowRegistry } from '@openthrottle/nestjs-agentic-workflow';
import {
  AGENTIC_WORKFLOW_RALPH_ID,
  AGENTIC_WORKFLOW_REGISTRY,
} from '@openthrottle/nestjs-agentic-workflow';
import type {
  WorkflowCorrelation,
  WorkflowLifecycleDispatcher,
} from '@openthrottle/openthrottle-agentic-workflow';
import { getWorkflowConfigCwd } from '@openthrottle/openthrottle-agentic-utils';
import {
  applyWorkflowRalphOtRootFromConfig,
  applyWorkflowRalphDebugCli,
  loadWorkflowRalphConfig,
  mergePlanRunTuningWithWorkflowRalphConfig,
} from '@tools/workflows';
import { buildRalphFlowContextFromPlanRunTuning } from '@openthrottle/openthrottle-agentic-ralph';
import type {
  WorkflowContext,
  WorkflowOrchestrator,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-ralph';
import type { RunPlanOrchestratorJobData } from './agentic-ralph.types';

type PlanRunTuningInput = NonNullable<
  Parameters<typeof buildRalphFlowContextFromPlanRunTuning>[0]['ralph']
>;

/**
 * @description In-process Ralph for the `plans` queue. Resolves the Ralph workflow from the
 * {@link AGENTIC_WORKFLOW_REGISTRY} by id ({@link AGENTIC_WORKFLOW_RALPH_ID}, `'ralph'`) and builds its
 * orchestrator via {@link AgenticWorkflowBase.createOrchestrator}. The registry indirection is
 * behavior-neutral: id `'ralph'` yields exactly today's `createWorkflowRalphOrchestrator(deps)` wiring
 * (`@openthrottle/openthrottle-agentic-ralph`, not the legacy `@openthrottle/openthrottle-workflows`).
 */
@Injectable()
export class AgenticRalphOrchestratorService {
  constructor(
    @Inject(AGENTIC_WORKFLOW_REGISTRY)
    private readonly workflowRegistry: AgenticWorkflowRegistry,
  ) {}

  /**
   * @description Runs one orchestrator job: GraphQL-backed pipeline with iteration runner chosen by
   * `executionBackend` / tuning (`cursor` or `claude`).
   */
  async runPlanOrchestratorJob(params: {
    readonly correlation?: WorkflowCorrelation;
    readonly jobData: RunPlanOrchestratorJobData;
    readonly lifecycleDispatcher?: WorkflowLifecycleDispatcher;
    readonly signal?: AbortSignal;
  }): Promise<WorkflowRunResult> {
    const { correlation, jobData, lifecycleDispatcher, signal } = params;
    const orchestrator = this.workflowRegistry
      .resolve(AGENTIC_WORKFLOW_RALPH_ID)
      .createOrchestrator() as WorkflowOrchestrator;

    const configCwd = getWorkflowConfigCwd(
      jobData.workingDirectory,
      process.env,
    );
    const config = loadWorkflowRalphConfig(configCwd, process.env);
    applyWorkflowRalphOtRootFromConfig(configCwd, process.env);

    const baseContext = buildRalphFlowContextFromPlanRunTuning({
      executionBackend: jobData.executionBackend,
      mode: jobData.mode ?? 'plan',
      planId: jobData.planId,
      ralph: mergePlanRunTuningWithWorkflowRalphConfig(
        jobData.ralph as PlanRunTuningInput | undefined,
        config,
      ) as PlanRunTuningInput | undefined,
      taskId: jobData.taskId,
    });

    applyWorkflowRalphDebugCli(baseContext.debug);

    const workingDirectory = jobData.workingDirectory?.trim();

    const context: WorkflowContext = {
      ...baseContext,
      ...(signal !== undefined ? { abortSignal: signal } : {}),
      ...(correlation !== undefined ? { correlation } : {}),
      ...(lifecycleDispatcher !== undefined ? { lifecycleDispatcher } : {}),
      ...(workingDirectory !== undefined && workingDirectory !== ''
        ? { workingDirectory }
        : {}),
    };

    return orchestrator.execute({ context });
  }
}
