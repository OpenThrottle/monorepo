import { Inject, Injectable } from '@nestjs/common';
import type { AgenticWorkflowRegistry } from '@openthrottle/nestjs-agentic-workflow';
import {
  AGENTIC_WORKFLOW_RALPH_ID,
  AGENTIC_WORKFLOW_REGISTRY,
} from '@openthrottle/nestjs-agentic-workflow';
import { PlanRunsService } from '@openthrottle/nestjs-repositories';
import type {
  WorkflowContext,
  WorkflowOrchestrator,
  WorkflowRunResult,
} from '@openthrottle/openthrottle-agentic-ralph';
import { buildRalphFlowContextFromPlanRunTuning } from '@openthrottle/openthrottle-agentic-ralph';
import type {
  WorkflowCorrelation,
  WorkflowLifecycleDispatcher,
} from '@openthrottle/openthrottle-agentic-workflow';
import {
  applyWorkflowRalphDebugCli,
  mergePlanRunTuningWithWorkflowRalphConfig,
} from '@tools/workflows';

import { PlanRunWorkspaceService } from '../../../services/plan-run-workspace/plan-run-workspace.service.ts';
import type { ProvisionedPlanRunWorktree } from '../../../services/plan-run-worktree-provision/plan-run-worktree-provision.types.ts';
import type { RunPlanOrchestratorJobData } from '../agentic-ralph.types.ts';

type PlanRunTuningInput = NonNullable<
  Parameters<typeof buildRalphFlowContextFromPlanRunTuning>[0]['ralph']
>;

/**
 * @description Drops the agent-CLI worktree flags from run tuning. Under option A the server
 * creates the worktree and runs the agent inside it, so passing `-w`/`--worktree` (or its cursor-only
 * companions) would make a SECOND worktree whose path nothing downstream knows.
 */
const stripAgentCliWorktreeFlags = (
  tuning: PlanRunTuningInput | undefined,
): PlanRunTuningInput | undefined => {
  if (tuning === undefined) return undefined;
  const {
    skipWorktreeSetup: _s,
    worktree: _w,
    worktreeBase: _b,
    ...rest
  } = tuning;
  return rest;
};

/**
 * @description In-process Ralph for the `plans` queue. Resolves the Ralph workflow from the
 * {@link AGENTIC_WORKFLOW_REGISTRY} by id ({@link AGENTIC_WORKFLOW_RALPH_ID}, `'ralph'`) and builds its
 * orchestrator via {@link AgenticWorkflowBase.createOrchestrator}. The registry indirection is
 * behavior-neutral: id `'ralph'` yields exactly today's `createWorkflowRalphOrchestrator(deps)` wiring
 * from `@openthrottle/openthrottle-agentic-ralph`. The run-start workspace setup (worktree provisioning, checkout
 * registration, snapshot rewrite, MCP preflight, foreign-skill injection, config load) lives in the
 * shared {@link PlanRunWorkspaceService}, which the OT Loop runner reuses.
 */
@Injectable()
export class AgenticRalphOrchestratorService {
  constructor(
    @Inject(AGENTIC_WORKFLOW_REGISTRY)
    private readonly workflowRegistry: AgenticWorkflowRegistry,
    private readonly planRunsService: PlanRunsService,
    private readonly planRunWorkspaceService: PlanRunWorkspaceService,
  ) {}

  /**
   * @description Runs one orchestrator job: GraphQL-backed pipeline with iteration runner chosen by
   * `executionBackend` / tuning (`cursor` or `claude`).
   */
  async runPlanOrchestratorJob(params: {
    readonly correlation?: WorkflowCorrelation;
    readonly jobData: RunPlanOrchestratorJobData;
    readonly lifecycleDispatcher?: WorkflowLifecycleDispatcher;
    /**
     * Called once, before the agent starts, when the run was provisioned into its own worktree —
     * never when it opted out and works in the base checkout. The worker uses it to tear the
     * worktree down after the run, from the path the run actually used rather than a re-derivation.
     */
    readonly onWorktreeProvisioned?: (
      worktree: ProvisionedPlanRunWorktree,
    ) => void;
    readonly signal?: AbortSignal;
    /**
     * Work-ledger run session id opened by the plans worker. Forwarded into the orchestrator
     * context so its status mutations carry X-OT-Session-Id (ambient attribution; G11 in
     * docs/monorepo/work-ledger-sessions.md).
     */
    readonly workSessionId?: string | null;
  }): Promise<WorkflowRunResult> {
    const {
      correlation,
      jobData,
      lifecycleDispatcher,
      onWorktreeProvisioned,
      signal,
      workSessionId,
    } = params;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- AGENTIC_WORKFLOW_REGISTRY is intentionally `any`-typed (AnyAgenticWorkflow); the dispatcher narrows to the ralph orchestrator at the call site
    const orchestrator = this.workflowRegistry
      .resolve(AGENTIC_WORKFLOW_RALPH_ID)
      .createOrchestrator() as WorkflowOrchestrator;

    const { config, injectedSkillNames, run, workingDirectory } =
      await this.planRunWorkspaceService.prepare({
        correlation,
        jobData,
        onWorktreeProvisioned,
        skipMcpPreflight: false,
        skipSkillInjection: false,
      });

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- jobData.ralph (RalphNestedRunTuningInput) → RalphPlanRunTuningInput: structurally-compatible cross-package tuning shapes
    const ralphTuningInput = jobData.ralph as PlanRunTuningInput | undefined;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- merge result retyped to the buildRalphFlowContextFromPlanRunTuning `ralph` param type
    const mergedRalphTuning = mergePlanRunTuningWithWorkflowRalphConfig(
      ralphTuningInput,
      config,
    ) as PlanRunTuningInput | undefined;

    // One worktree per run, not two: the agent CLI's -w/--worktree must stay off now that the
    // server created the worktree and is running the agent inside it. Strip the worktree keys the
    // merge may have (re)introduced from `.workflow-ralph.json` as well as from the job payload.
    const agentRalphTuning = stripAgentCliWorktreeFlags(mergedRalphTuning);

    const baseContext = buildRalphFlowContextFromPlanRunTuning({
      executionBackend: jobData.executionBackend,
      mode: jobData.mode ?? 'plan',
      planId: jobData.planId,
      ralph: agentRalphTuning,
      taskId: jobData.taskId,
    });

    applyWorkflowRalphDebugCli(baseContext.debug);

    // The resolved worktree — not the enqueued base path — is where the agent runs.
    const context: WorkflowContext = {
      ...baseContext,
      // Channel 1 marker poll: the run loop calls this at each iteration boundary so a durable
      // cancel request (stamped by cancelRun) stops this run even if the pub/sub signal was missed.
      isCancellationRequested: async () =>
        (await this.planRunsService.readCancelRequested(jobData.planId)) !==
        null,
      ...(signal !== undefined ? { abortSignal: signal } : {}),
      ...(correlation !== undefined ? { correlation } : {}),
      ...(run !== null ? { planRunId: run.id } : {}),
      ...(lifecycleDispatcher !== undefined ? { lifecycleDispatcher } : {}),
      ...(injectedSkillNames.length > 0 ? { injectedSkillNames } : {}),
      ...(workingDirectory.trim() !== ''
        ? { workingDirectory: workingDirectory.trim() }
        : {}),
      ...(workSessionId != null && workSessionId !== ''
        ? { workSessionId }
        : {}),
    };

    return orchestrator.execute({ context });
  }
}
