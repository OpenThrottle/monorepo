import { Inject, Injectable } from '@nestjs/common';
import type { AgenticWorkflowRegistry } from '@openthrottle/nestjs-agentic-workflow';
import {
  AGENTIC_WORKFLOW_RALPH_ID,
  AGENTIC_WORKFLOW_REGISTRY,
} from '@openthrottle/nestjs-agentic-workflow';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  PlanOutputStreamService,
  PlanRunsService,
  RepositoryCheckoutsService,
  UserWorkspaceSettingsService,
} from '@openthrottle/nestjs-repositories';
import type {
  WorkflowConfigRunner,
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
import { PlanRunWorkspacePreflightService } from '../../services/plan-run-workspace-preflight/plan-run-workspace-preflight.service';
import { PlanRunWorktreeProvisionService } from '../../services/plan-run-worktree-provision/plan-run-worktree-provision.service';
import type { RunPlanOrchestratorJobData } from './agentic-ralph.types';

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
    private readonly planOutputStreamService: PlanOutputStreamService,
    private readonly planRunsService: PlanRunsService,
    private readonly planRunWorktreeCheckoutService: PlanRunWorktreeCheckoutService,
    private readonly planRunWorkspacePreflightService: PlanRunWorkspacePreflightService,
    private readonly planRunWorktreeProvisionService: PlanRunWorktreeProvisionService,
    private readonly repositoryCheckoutsService: RepositoryCheckoutsService,
    private readonly userWorkspaceSettingsService: UserWorkspaceSettingsService,
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

    const baseCheckoutCwd = getWorkflowConfigCwd(
      jobData.workingDirectory,
      process.env,
    );

    // Resolve the plan_run once from the queue correlation; both the checkout registration and the
    // per-user injection gate need the acting user (run.actorUserId). Soft: null when unresolved.
    const run = await this.resolveRunFromCorrelation(correlation);

    // OpenThrottle owns the worktree (option A): create it here, at job start, so the path is known
    // before the first agent turn — which is what checkout registration, `.env` provisioning, and
    // per-path agent-CLI MCP approval all need. Everything downstream (config load, foreign-skill
    // injection, checkout registration, the agent's cwd) targets this path, not the base checkout.
    const configCwd = await this.resolveRunWorkingDirectory({
      baseCheckoutCwd,
      jobData,
      run,
    });

    // Soft-fail registration: must not abort the agent run when checkout lookup/upsert fails.
    await this.maybeRegisterWorktreeCheckout({
      filesystemPath: configCwd,
      run,
    });

    // The snapshot was written at enqueue, before the worktree existed. Re-point its workspace at
    // the directory the agent actually uses so the run record is not misleading. Soft-fail.
    await this.recordResolvedWorkspaceOnSnapshot({
      run,
      workingDirectory: configCwd,
    });

    // A run that cannot reach openthrottle-mcp does its work and reports success having changed
    // nothing. Say so in the output stream, loudly, against the directory the agent actually uses.
    await this.warnOnWorkspacePreflight({
      backend: jobData.executionBackend ?? 'cursor',
      planId: jobData.planId,
      workingDirectory: configCwd,
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
    const workingDirectory = configCwd.trim();

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
   * @description Runs the workspace MCP/.env preflight against the run's directory and writes any
   * warning into the plan output stream, where the run's reader will see it. Warn-only: the run
   * continues, but a false success is no longer silent. Soft-fails.
   */
  private async warnOnWorkspacePreflight(params: {
    readonly backend: WorkflowConfigRunner;
    readonly planId: string;
    readonly workingDirectory: string;
  }): Promise<void> {
    const { backend, planId, workingDirectory } = params;

    try {
      const warnings = this.planRunWorkspacePreflightService.check({
        backend,
        workingDirectory,
      });
      if (warnings.length === 0) {
        return;
      }

      const content = [
        `⚠️  Workspace preflight found ${warnings.length} problem(s) in ${workingDirectory} (backend: ${backend}). MCP-dependent work may silently do nothing.`,
        ...warnings.map((warning) => `- ${warning}`),
      ].join('\n');

      this.logger.warn(content, AgenticRalphOrchestratorService.name);

      const repo = this.planOutputStreamService.getRepository();
      await repo.save(repo.create({ content, iteration: null, planId }));
    } catch (error) {
      this.logger.warn(
        `Soft-fail running the workspace preflight for plan ${planId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AgenticRalphOrchestratorService.name,
      );
    }
  }

  /**
   * @description Re-points `run_config_snapshot.workspace` at the resolved directory (and the
   * checkout id, once registration has back-filled it). Soft-fails: a stale snapshot must never
   * abort the agent run.
   */
  private async recordResolvedWorkspaceOnSnapshot(params: {
    readonly run: PlanRun | null;
    readonly workingDirectory: string;
  }): Promise<void> {
    const { run, workingDirectory } = params;
    if (run === null) return;
    if (
      run.runConfigSnapshot?.workspace?.workingDirectory === workingDirectory
    ) {
      return;
    }

    try {
      const latest = await this.planRunsService.findById(run.id);
      await this.planRunsService.setRunConfigSnapshotWorkspace(run.id, {
        checkoutId: latest?.checkoutId ?? null,
        workingDirectory,
      });
    } catch (error) {
      this.logger.warn(
        `Soft-fail recording the resolved workspace on run ${run.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AgenticRalphOrchestratorService.name,
      );
    }
  }

  /**
   * @description Resolves the directory this run executes in. When the job payload names a worktree
   * (the enqueue default derives `plan-<short plan id>`; absence means the caller explicitly opted
   * out via `disableWorktree`), provisions it and returns its absolute path. Fails the run when
   * provisioning fails — falling back to the base checkout is exactly the bug this replaces.
   */
  private async resolveRunWorkingDirectory(params: {
    readonly baseCheckoutCwd: string;
    readonly jobData: RunPlanOrchestratorJobData;
    readonly run: PlanRun | null;
  }): Promise<string> {
    const { baseCheckoutCwd, jobData, run } = params;

    const worktreeName = jobData.ralph?.worktree?.trim();
    if (worktreeName === undefined || worktreeName === '') {
      this.logger.log(
        `Plan run ${jobData.planId} opted out of a worktree; working in ${baseCheckoutCwd}`,
        AgenticRalphOrchestratorService.name,
      );
      return baseCheckoutCwd;
    }

    const worktreeRoot = await this.resolveConfiguredWorktreeRoot(run);

    const worktreePath = await this.planRunWorktreeProvisionService.provision({
      baseCheckoutPath: baseCheckoutCwd,
      worktreeName,
      worktreeRoot,
    });

    this.logger.log(
      `Plan run ${jobData.planId} working in worktree ${worktreePath}`,
      AgenticRalphOrchestratorService.name,
    );

    return worktreePath;
  }

  /**
   * @description The acting user's configured worktree root, or null to let
   * `scripts/create_worktree.sh` resolve its own default. Soft: never blocks a run.
   */
  private async resolveConfiguredWorktreeRoot(
    run: PlanRun | null,
  ): Promise<string | null> {
    const actorUserId = run?.actorUserId?.trim();
    if (actorUserId === undefined || actorUserId === '') {
      return null;
    }

    try {
      const settings =
        await this.userWorkspaceSettingsService.getOrCreateForUser(actorUserId);
      const root = settings.worktreeRoot?.trim();
      return root === undefined || root === '' ? null : root;
    } catch (error) {
      this.logger.warn(
        `Soft-fail resolving the configured worktree root for user ${actorUserId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AgenticRalphOrchestratorService.name,
      );
      return null;
    }
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
