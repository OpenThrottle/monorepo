import { Inject, Injectable } from '@nestjs/common';
import type { AgenticWorkflowRegistry } from '@openthrottle/nestjs-agentic-workflow';
import {
  AGENTIC_WORKFLOW_RALPH_ID,
  AGENTIC_WORKFLOW_REGISTRY,
} from '@openthrottle/nestjs-agentic-workflow';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  PlanRunsService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import type {
  WorkflowCorrelation,
  WorkflowLifecycleDispatcher,
} from '@openthrottle/openthrottle-agentic-workflow';
import {
  ensureMaterialized,
  getWorkflowConfigCwd,
  resolveForeignWorkspaceContext,
  resolvePersonalSkillsDir,
} from '@openthrottle/openthrottle-agentic-utils';
import { join } from 'node:path';
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
import { PlanRunWorktreeCheckoutService } from '../../services/plan-run-worktree-checkout/plan-run-worktree-checkout.service';
import type { RunPlanOrchestratorJobData } from './agentic-ralph.types';

type PlanRunTuningInput = NonNullable<
  Parameters<typeof buildRalphFlowContextFromPlanRunTuning>[0]['ralph']
>;

/**
 * @description In-process Ralph for the `plans` queue. Resolves the Ralph workflow from the
 * {@link AGENTIC_WORKFLOW_REGISTRY} by id ({@link AGENTIC_WORKFLOW_RALPH_ID}, `'ralph'`) and builds its
 * orchestrator via {@link AgenticWorkflowBase.createOrchestrator}. The registry indirection is
 * behavior-neutral: id `'ralph'` yields exactly today's `createWorkflowRalphOrchestrator(deps)` wiring
 * from `@openthrottle/openthrottle-agentic-ralph`. After the concrete worktree path is resolved and
 * before the first agent turn, soft-registers a linked worktree checkout when
 * `plan_runs.checkout_id` is still NULL (see {@link PlanRunWorktreeCheckoutService}).
 */
@Injectable()
export class AgenticRalphOrchestratorService {
  constructor(
    @Inject(AGENTIC_WORKFLOW_REGISTRY)
    private readonly workflowRegistry: AgenticWorkflowRegistry,
    private readonly logger: LoggerService,
    private readonly planRunsService: PlanRunsService,
    private readonly planRunWorktreeCheckoutService: PlanRunWorktreeCheckoutService,
    private readonly repositoryCheckoutsService: RepositoryCheckoutsService,
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
    /**
     * Work-ledger run session id opened by the plans worker. Forwarded into the orchestrator
     * context so its status mutations carry X-OT-Session-Id (ambient attribution, G11).
     */
    readonly workSessionId?: string | null;
  }): Promise<WorkflowRunResult> {
    const { correlation, jobData, lifecycleDispatcher, signal, workSessionId } =
      params;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- AGENTIC_WORKFLOW_REGISTRY is intentionally `any`-typed (AnyAgenticWorkflow); the dispatcher narrows to the ralph orchestrator at the call site
    const orchestrator = this.workflowRegistry
      .resolve(AGENTIC_WORKFLOW_RALPH_ID)
      .createOrchestrator() as WorkflowOrchestrator;

    const configCwd = getWorkflowConfigCwd(
      jobData.workingDirectory,
      process.env,
    );

    // Resolve the plan_run once from the queue correlation; both the checkout registration and the
    // per-user injection gate need the acting user (run.actorUserId). Soft: null when unresolved.
    const run = await this.resolveRunFromCorrelation(correlation);

    // Soft-fail registration: must not abort the agent run when checkout lookup/upsert fails.
    await this.maybeRegisterWorktreeCheckout({
      filesystemPath: configCwd,
      run,
    });

    // Server-scoped foreign-skill injection, gated per user: materialize OT curated skills into the
    // target repo only when the acting user has opted this checkout in (repository_checkouts flag).
    // Idempotent + reused across runs; torn down on server shutdown, not per-run. Soft-fail so
    // injection never aborts the agent run.
    const injectedSkillNames = await this.maybeInjectForeignSkills({
      configCwd,
      run,
    });

    const config = loadWorkflowRalphConfig(configCwd, process.env);
    applyWorkflowRalphOtRootFromConfig(configCwd, process.env);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- jobData.ralph (RalphNestedRunTuningInput) → RalphPlanRunTuningInput: structurally-compatible cross-package tuning shapes
    const ralphTuningInput = jobData.ralph as PlanRunTuningInput | undefined;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- merge result retyped to the buildRalphFlowContextFromPlanRunTuning `ralph` param type
    const mergedRalphTuning = mergePlanRunTuningWithWorkflowRalphConfig(
      ralphTuningInput,
      config,
    ) as PlanRunTuningInput | undefined;

    const baseContext = buildRalphFlowContextFromPlanRunTuning({
      executionBackend: jobData.executionBackend,
      mode: jobData.mode ?? 'plan',
      planId: jobData.planId,
      ralph: mergedRalphTuning,
      taskId: jobData.taskId,
    });

    applyWorkflowRalphDebugCli(baseContext.debug);

    const workingDirectory = jobData.workingDirectory?.trim();

    const context: WorkflowContext = {
      ...baseContext,
      // Channel 1 marker poll: the run loop calls this at each iteration boundary so a durable
      // cancel request (stamped by cancelRun) stops this run even if the pub/sub signal was missed.
      isCancellationRequested: async () =>
        (await this.planRunsService.readCancelRequested(jobData.planId)) !==
        null,
      ...(signal !== undefined ? { abortSignal: signal } : {}),
      ...(correlation !== undefined ? { correlation } : {}),
      ...(lifecycleDispatcher !== undefined ? { lifecycleDispatcher } : {}),
      ...(injectedSkillNames.length > 0 ? { injectedSkillNames } : {}),
      ...(workingDirectory !== undefined && workingDirectory !== ''
        ? { workingDirectory }
        : {}),
      ...(workSessionId != null && workSessionId !== ''
        ? { workSessionId }
        : {}),
    };

    return orchestrator.execute({ context });
  }

  /**
   * @description Resolves the `plan_runs` row for a queue correlation (its unique
   * `(queueName, bullmqJobId)` key), or null when the correlation is absent/unresolvable.
   * Soft: swallows lookup errors so neither downstream consumer (checkout registration,
   * injection gate) can abort the orchestrator.
   */
  private async resolveRunFromCorrelation(
    correlation?: WorkflowCorrelation,
  ): Promise<PlanRun | null> {
    const queueJobId = correlation?.queueJobId?.trim();
    const queueName = correlation?.queueName?.trim();
    if (
      queueJobId === undefined ||
      queueJobId === '' ||
      queueName === undefined ||
      queueName === ''
    ) {
      return null;
    }
    try {
      return await this.planRunsService.findByQueueNameAndBullmqJobId(
        queueName,
        queueJobId,
      );
    } catch (error) {
      this.logger.warn(
        `Soft-fail resolving plan_run for ${queueName}/${queueJobId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AgenticRalphOrchestratorService.name,
      );
      return null;
    }
  }

  /**
   * @description Foreign-run only, per-user gated: materializes OpenThrottle curated skills into the
   * target repo and returns the injected skill names. Returns empty when the run is inside the OT
   * monorepo, the acting user cannot be resolved, the run's checkout is not opted in
   * (`repository_checkouts.foreign_skill_injection_enabled`, default false), or on any failure.
   * The opt-in is keyed on `(actorUserId, configCwd)` — the exact on-disk path the run touches.
   * Non-mutating and reused across runs; soft-fails so a problem never aborts the orchestrator.
   *
   * Note: the gate reads the flag for `configCwd` specifically. A brand-new worktree checkout row
   * created during this same run defaults to false; toggling a repository on flips the user's
   * existing checkouts, which covers the common registered-checkout (primary) foreign case.
   */
  private async maybeInjectForeignSkills(params: {
    readonly configCwd: string;
    readonly run: PlanRun | null;
  }): Promise<readonly string[]> {
    const { configCwd, run } = params;
    const foreign = resolveForeignWorkspaceContext(configCwd, process.env);
    if (!foreign.isForeign || foreign.openThrottleRoot === undefined) {
      return [];
    }

    const actorUserId = run?.actorUserId?.trim();
    if (actorUserId === undefined || actorUserId === '') {
      // Opt-in requires a resolvable user to read the per-user flag; no actor => treat as off.
      return [];
    }

    try {
      const checkout = await this.repositoryCheckoutsService.findByUserAndPath(
        actorUserId,
        configCwd,
      );
      if (checkout?.foreignSkillInjectionEnabled !== true) {
        // Unregistered path or explicit opt-out.
        return [];
      }

      const result = ensureMaterialized({
        env: process.env,
        otCuratedSkillsDir: join(foreign.openThrottleRoot, 'skills'),
        personalSkillsDir: resolvePersonalSkillsDir(process.env),
        repoPath: configCwd,
      });
      for (const warning of result.warnings) {
        this.logger.warn(`Foreign-skill injection: ${warning}`);
      }
      return result.injectedNames;
    } catch (error) {
      this.logger.warn(
        `Foreign-skill injection failed for ${configCwd}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }
  }

  /**
   * @description Once at run-start path resolve: when the plan run still has a NULL
   * `checkout_id` and an actor user, register the resolved filesystem path as a
   * linked worktree checkout. Soft-fails (log + continue) so registration never
   * aborts the orchestrator.
   */
  private async maybeRegisterWorktreeCheckout(params: {
    readonly filesystemPath: string;
    readonly run: PlanRun | null;
  }): Promise<void> {
    const { filesystemPath, run } = params;

    if (run === null) {
      return;
    }

    if (run.checkoutId !== null) {
      return;
    }

    const actorUserId = run.actorUserId?.trim();
    if (actorUserId === undefined || actorUserId === '') {
      this.logger.debug(
        `Skipping worktree checkout registration for run ${run.id}: actor_user_id is null`,
        AgenticRalphOrchestratorService.name,
      );
      return;
    }

    try {
      await this.planRunWorktreeCheckoutService.register({
        filesystemPath,
        planRunId: run.id,
        userId: actorUserId,
      });
    } catch (error) {
      this.logger.warn(
        `Soft-fail worktree checkout registration at ${filesystemPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AgenticRalphOrchestratorService.name,
      );
    }
  }
}
