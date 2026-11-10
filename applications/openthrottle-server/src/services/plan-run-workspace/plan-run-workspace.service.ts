/**
 * @description Run-start workspace setup shared by the in-process plan runners. Extracted from
 * {@link AgenticRalphOrchestratorService} unchanged so OT Loop reuses it rather than duplicating it
 * (docs/workflows/ot-loop-job.md § 1, "Branch point").
 */

import { join } from 'node:path';

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  PlanOutputStreamService,
  PlanRunsService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import {
  ensureMaterialized,
  getOpenThrottleRoot,
  getWorkflowConfigCwd,
  OPENTHROTTLE_WORKSPACE_MARKER,
  resolveForeignWorkspaceContext,
  resolvePersonalSkillsDir,
} from '@openthrottle/openthrottle-agentic-utils';
import type {
  WorkflowConfigRunner,
  WorkflowCorrelation,
} from '@openthrottle/openthrottle-agentic-workflow';
import {
  applyWorkflowRalphOtRootFromConfig,
  loadWorkflowRalphConfig,
} from '@tools/workflows';
import { UnrecoverableError } from 'bullmq';

import type { RunPlanOrchestratorJobData } from '../../queues/agentic-ralph/agentic-ralph.types.ts';
import { WorktreeSkillOverlayService } from '../foreign-skill-injection/worktree-skill-overlay/worktree-skill-overlay.service.ts';
import { PlanRunWorkspacePreflightService } from '../plan-run-workspace-preflight/plan-run-workspace-preflight.service.ts';
import { PlanRunWorktreeCheckoutService } from '../plan-run-worktree-checkout/plan-run-worktree-checkout.service.ts';
import { PlanRunWorktreeProvisionService } from '../plan-run-worktree-provision/plan-run-worktree-provision.service.ts';
import type { ProvisionedPlanRunWorktree } from '../plan-run-worktree-provision/plan-run-worktree-provision.types.ts';
import type {
  PreparedPlanRunWorkspace,
  PreparePlanRunWorkspaceParams,
} from './plan-run-workspace.types.ts';

@Injectable()
export class PlanRunWorkspaceService {
  constructor(
    private readonly logger: LoggerService,
    private readonly planOutputStreamService: PlanOutputStreamService,
    private readonly planRunsService: PlanRunsService,
    private readonly planRunWorktreeCheckoutService: PlanRunWorktreeCheckoutService,
    private readonly planRunWorkspacePreflightService: PlanRunWorkspacePreflightService,
    private readonly planRunWorktreeProvisionService: PlanRunWorktreeProvisionService,
    private readonly repositoryCheckoutsService: RepositoryCheckoutsService,
    private readonly worktreeSkillOverlayService: WorktreeSkillOverlayService,
  ) {}

  /**
   * @description Resolves the run row, provisions the worktree (OpenThrottle owns it, option A),
   * registers its checkout, re-points the snapshot workspace, optionally preflights MCP and injects
   * foreign skills, then loads the repo's workflow config from the directory the agent actually uses.
   */
  async prepare(
    params: PreparePlanRunWorkspaceParams,
  ): Promise<PreparedPlanRunWorkspace> {
    const {
      correlation,
      jobData,
      onWorktreeProvisioned,
      skipMcpPreflight,
      skipSkillInjection,
    } = params;
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
    const resolvedWorkspace = await this.resolveRunWorkingDirectory({
      baseCheckoutCwd,
      jobData,
      run,
    });
    const configCwd = resolvedWorkspace.workingDirectory;
    if (resolvedWorkspace.worktree !== null) {
      onWorktreeProvisioned?.(resolvedWorkspace.worktree);
    }

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
    if (!skipMcpPreflight) {
      await this.warnOnWorkspacePreflight({
        backend: jobData.executionBackend ?? 'cursor',
        planId: jobData.planId,
        workingDirectory: configCwd,
      });
    }

    // Server-scoped foreign-skill injection, gated per user: materialize OT curated skills into the
    // target repo only when the acting user has opted this checkout in (repository_checkouts flag).
    // Idempotent + reused across runs; torn down on server shutdown, not per-run. Soft-fail so
    // injection never aborts the agent run.
    const injectedSkillNames = skipSkillInjection
      ? []
      : await this.maybeInjectForeignSkills({ configCwd, run });

    const config = loadWorkflowRalphConfig(configCwd, process.env);
    applyWorkflowRalphOtRootFromConfig(configCwd, process.env);

    return {
      config,
      injectedSkillNames,
      run,
      workingDirectory: configCwd,
    };
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

      this.logger.warn(content, PlanRunWorkspaceService.name);

      const repo = this.planOutputStreamService.getRepository();
      await repo.save(repo.create({ content, iteration: null, planId }));
    } catch (error) {
      this.logger.warn(
        `Soft-fail running the workspace preflight for plan ${planId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        PlanRunWorkspaceService.name,
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
        PlanRunWorkspaceService.name,
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
  }): Promise<{
    readonly workingDirectory: string;
    readonly worktree: ProvisionedPlanRunWorktree | null;
  }> {
    const { baseCheckoutCwd, jobData, run } = params;

    const worktreeName = jobData.ralph?.worktree?.trim();
    if (worktreeName === undefined || worktreeName === '') {
      this.logger.log(
        `Plan run ${jobData.planId} opted out of a worktree; working in ${baseCheckoutCwd}`,
        PlanRunWorkspaceService.name,
      );
      return { workingDirectory: baseCheckoutCwd, worktree: null };
    }

    // The ot-worktree create action must run from a repo root. An explicit `workingDirectory` (itself
    // derived from checkoutId/repositoryId upstream — see PlanEnqueueService.resolveWorkspace) is
    // trusted as-is and takes precedence, unchanged. Absent that, `baseCheckoutCwd` is whatever
    // `getWorkflowConfigCwd` fell back to (WORKSPACE_ROOT, or this process's own cwd — a
    // subdirectory such as `applications/openthrottle-server` when nothing named a checkout), which
    // is not necessarily a repo root and must not be handed to the script.
    const explicitWorkingDirectory = jobData.workingDirectory?.trim();
    const hasExplicitWorkingDirectory =
      explicitWorkingDirectory !== undefined && explicitWorkingDirectory !== '';
    let baseCheckoutPath = baseCheckoutCwd;
    if (!hasExplicitWorkingDirectory) {
      baseCheckoutPath = this.resolveRepoRootForWorktreeProvisioning(
        jobData.planId,
        worktreeName,
      );
    }

    // Foreign checkouts only, default on, honouring the per-checkout opt-out. Never throws: an
    // opted-out or failed overlay still provisions, through the server's own ot-worktree scripts.
    await this.worktreeSkillOverlayService.ensureForBaseCheckout({
      actorUserId: run?.actorUserId ?? null,
      baseCheckoutPath,
    });

    const worktreePath = await this.planRunWorktreeProvisionService.provision({
      baseCheckoutPath,
      worktreeName,
    });

    this.logger.log(
      `Plan run ${jobData.planId} working in worktree ${worktreePath}`,
      PlanRunWorkspaceService.name,
    );

    return {
      workingDirectory: worktreePath,
      worktree: { baseCheckoutPath, worktreePath },
    };
  }

  /**
   * @description Resolves a genuine OpenThrottle repo root (via {@link getOpenThrottleRoot}'s
   * `.openthrottle.mjs` marker walk) to run the ot-worktree create action from — it needs a repo root — when
   * the enqueue named no checkoutId/repositoryId/workingDirectory. Throws a legible error naming
   * what is missing when no root is resolvable, so the job fails fast with that message in
   * `failedReason` instead of retrying three times against a doomed `baseCheckoutPath` and giving up
   * silently. The error is BullMQ's `UnrecoverableError`: nothing about a retry would change it.
   */
  private resolveRepoRootForWorktreeProvisioning(
    planId: string,
    worktreeName: string,
  ): string {
    const repoRoot = getOpenThrottleRoot(process.env);
    if (repoRoot === undefined) {
      throw new UnrecoverableError(
        `Cannot provision worktree "${worktreeName}" for plan run ${planId}: no checkoutId, ` +
          `repositoryId, or workingDirectory was provided on enqueue, and no OpenThrottle ` +
          `repository root could be resolved from this process (checked WORKFLOW_RALPH_OT_ROOT, ` +
          `WORKSPACE_ROOT, and a walk up from this process's cwd for the ` +
          `${OPENTHROTTLE_WORKSPACE_MARKER} marker). Pass a checkoutId, repositoryId, or ` +
          `workingDirectory when enqueuing this plan run, or set WORKSPACE_ROOT/WORKFLOW_RALPH_OT_ROOT ` +
          `on the server process.`,
      );
    }
    return repoRoot;
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
        PlanRunWorkspaceService.name,
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
   * @description Once at run-start path resolve: with an actor user, register the
   * resolved filesystem path as a linked worktree checkout and point the run at
   * that checkout + branch — even when enqueue already stamped a primary
   * `checkout_id`. Soft-fails (log + continue) so registration never aborts the
   * orchestrator. A non-worktree path is a soft no-op inside the registration
   * service (leaves the enqueue checkout alone).
   */
  private async maybeRegisterWorktreeCheckout(params: {
    readonly filesystemPath: string;
    readonly run: PlanRun | null;
  }): Promise<void> {
    const { filesystemPath, run } = params;

    if (run === null) {
      return;
    }

    const actorUserId = run.actorUserId?.trim();
    if (actorUserId === undefined || actorUserId === '') {
      this.logger.debug(
        `Skipping worktree checkout registration for run ${run.id}: actor_user_id is null`,
        PlanRunWorkspaceService.name,
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
        PlanRunWorkspaceService.name,
      );
    }
  }
}
