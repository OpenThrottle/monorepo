/**
 * @description Run-start workspace setup for the OT Loop plan runner (docs/workflows/ot-loop-job.md § 1).
 */

import { join } from 'node:path';

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories-server';
import { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import { PlanRunsRepository } from '@openthrottle/nestjs-repositories-server';
import { PlanOutputStreamRepository } from '@openthrottle/nestjs-repositories-server';
import {
  applyPlanRunOtRootFromConfig,
  loadPlanRunConfig,
} from '@openthrottle/openthrottle-agentic-loop';
import type { AgentConfigTrust } from '@openthrottle/openthrottle-agentic-utils';
import type {
  WorkflowConfigRunner,
  WorkflowCorrelation,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  AGENT_CONFIG_POSTURE,
  ensureMaterialized,
  getOpenThrottleRoot,
  getWorkflowConfigCwd,
  isOpenThrottleCheckout,
  OPENTHROTTLE_WORKSPACE_MARKER,
  resolveAgentConfigTrust,
  resolveForeignWorkspaceContext,
  resolvePersonalSkillsDir,
} from '@openthrottle/openthrottle-agentic-utils';
import type {
  AgentDriver,
  DriverRepoAgentConfig,
} from '@openthrottle/openthrottle-drivers';
import { checkRepoAgentConfig } from '@openthrottle/openthrottle-drivers';
import { UnrecoverableError } from 'bullmq';

import type { RunPlanOrchestratorJobData } from '../../queues/plans/plans.types.ts';
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
    private readonly planOutputStreamRepository: PlanOutputStreamRepository,
    private readonly planRunsRepository: PlanRunsRepository,
    private readonly planRunWorktreeCheckoutService: PlanRunWorktreeCheckoutService,
    private readonly planRunWorkspacePreflightService: PlanRunWorkspacePreflightService,
    private readonly planRunWorktreeProvisionService: PlanRunWorktreeProvisionService,
    private readonly repositoryCheckoutsRepository: RepositoryCheckoutsRepository,
    private readonly worktreeSkillOverlayService: WorktreeSkillOverlayService,
  ) {}

  /**
   * @description Resolves the run row, provisions the worktree (OpenThrottle owns it, option A),
   * registers its checkout, re-points the snapshot workspace, optionally preflights MCP, injects
   * foreign skills, then loads the repo's workflow config from the directory the agent actually uses.
   */
  async prepare(
    params: PreparePlanRunWorkspaceParams,
  ): Promise<PreparedPlanRunWorkspace> {
    const { correlation, jobData, onWorktreeProvisioned, skipMcpPreflight } =
      params;
    const baseCheckoutCwd = getWorkflowConfigCwd(
      jobData.workingDirectory,
      process.env,
    );

    // Resolve the plan_run once from the queue correlation; both the checkout registration and the
    // per-user injection gate need the acting user (run.actorUserId). Soft: null when unresolved.
    const run = await this.resolveRunFromCorrelation(correlation);

    // Trust is the BASE checkout's: a provisioned worktree is a fresh checkout row that never carries
    // the user's consent, and is the same repository's config either way.
    const agentConfigTrust = await this.resolveAgentConfigTrust({
      baseCheckoutCwd,
      run,
    });
    await this.narrateAgentConfigTrust({
      baseCheckoutCwd,
      planId: jobData.planId,
      trust: agentConfigTrust,
    });

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
    // An isolated run never reads the checkout's MCP config, so a preflight of it would only mislead.
    const isolated = agentConfigTrust.posture === AGENT_CONFIG_POSTURE.ISOLATED;
    if (!skipMcpPreflight && !isolated) {
      await this.warnOnWorkspacePreflight({
        driver: jobData.driver ?? 'cursor',
        planId: jobData.planId,
        workingDirectory: configCwd,
      });
    }

    // Foreign-skill injection into the directory the agent runs in, gated on the BASE checkout's
    // opt-in: a plan-run worktree is a fresh directory the settings switch never reached, and its
    // checkout row is new and off. Rule-injected "Run /<skill>" tasks need the skill on disk there.
    // Removed with the worktree at teardown. Soft-fail so injection never aborts the agent run.
    const injectedSkillNames = await this.maybeInjectForeignSkills({
      baseCheckoutCwd,
      configCwd,
      planId: jobData.planId,
      run,
    });

    const config = loadPlanRunConfig(configCwd, process.env);
    applyPlanRunOtRootFromConfig(configCwd, process.env);

    return {
      agentConfigTrust,
      config,
      injectedSkillNames,
      run,
      workingDirectory: configCwd,
    };
  }

  /**
   * @description Turns a run's trust into the driver posture. An isolated run gets no MCP servers:
   * the checkout's own are suppressed, and the OT Loop worker uses none of OpenThrottle's.
   */
  buildRepoAgentConfig(trust: AgentConfigTrust): DriverRepoAgentConfig {
    if (trust.posture === AGENT_CONFIG_POSTURE.TRUSTED) {
      return { kind: 'trusted' };
    }

    return { kind: 'isolated', mcpServers: {} };
  }

  /**
   * @description Refuses a run before its first iteration when the posture is isolated and the
   * driver cannot suppress the checkout's config, saying why in plan output. Throws
   * `UnrecoverableError`: retrying cannot help until the user trusts the repository or picks
   * another driver, and running anyway is exactly what the gate exists to prevent.
   */
  async refuseUnlessDriverHonoursPosture(params: {
    readonly driver: AgentDriver;
    readonly planId: string;
    readonly repoAgentConfig: DriverRepoAgentConfig;
  }): Promise<void> {
    const { driver, planId, repoAgentConfig } = params;
    const check = checkRepoAgentConfig(driver, { repoAgentConfig });
    if (check.ok) {
      return;
    }

    const content = `🔒 Run refused: ${check.reason}`;
    this.logger.warn(content, PlanRunWorkspaceService.name);
    try {
      await this.planOutputStreamRepository.create({
        content,
        iteration: null,
        planId,
      });
    } catch {
      // The refusal stands even when it cannot be narrated.
    }

    throw new UnrecoverableError(check.reason);
  }

  /**
   * @description Reads the acting user's checkout row for the base directory and resolves trust.
   * Fails closed: no actor, no row, or a failed read all leave a foreign directory isolated.
   */
  private async resolveAgentConfigTrust(params: {
    readonly baseCheckoutCwd: string;
    readonly run: PlanRun | null;
  }): Promise<AgentConfigTrust> {
    const { baseCheckoutCwd, run } = params;
    // The OpenThrottle checkout is trusted whatever its row says, so it needs no lookup at all.
    const isOpenThrottle = isOpenThrottleCheckout(
      resolveForeignWorkspaceContext(baseCheckoutCwd, process.env),
    );
    if (isOpenThrottle) {
      return resolveAgentConfigTrust({
        checkout: null,
        isOpenThrottleCheckout: true,
      });
    }

    const actorUserId = run?.actorUserId?.trim();
    if (actorUserId === undefined || actorUserId === '') {
      return resolveAgentConfigTrust({
        checkout: null,
        isOpenThrottleCheckout: false,
      });
    }

    try {
      const checkout =
        await this.repositoryCheckoutsRepository.findByUserAndPath(
          actorUserId,
          baseCheckoutCwd,
        );

      return resolveAgentConfigTrust({
        checkout: checkout ?? null,
        isOpenThrottleCheckout: false,
      });
    } catch (error) {
      this.logger.warn(
        `Could not read checkout trust for ${baseCheckoutCwd}; treating it as untrusted: ${
          error instanceof Error ? error.message : String(error)
        }`,
        PlanRunWorkspaceService.name,
      );

      return resolveAgentConfigTrust({
        checkout: null,
        isOpenThrottleCheckout: false,
      });
    }
  }

  /**
   * @description Says once, at run start, that an untrusted checkout's own agent config is
   * suppressed. A trusted run says nothing, so its output reads exactly as it did before the gate.
   * Soft-fails.
   */
  private async narrateAgentConfigTrust(params: {
    readonly baseCheckoutCwd: string;
    readonly planId: string;
    readonly trust: AgentConfigTrust;
  }): Promise<void> {
    const { baseCheckoutCwd, planId, trust } = params;
    if (trust.posture === AGENT_CONFIG_POSTURE.TRUSTED) {
      return;
    }

    const content = `🔒 Untrusted checkout ${baseCheckoutCwd}: its own hooks and MCP servers are suppressed; only OpenThrottle's plugin hooks load. Trust the repository on its settings page to change this.`;

    try {
      await this.planOutputStreamRepository.create({
        content,
        iteration: null,
        planId,
      });
    } catch (error) {
      this.logger.warn(
        `Soft-fail narrating checkout trust for plan ${planId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        PlanRunWorkspaceService.name,
      );
    }
  }

  /**
   * @description Runs the workspace MCP/.env preflight against the run's directory and writes any
   * warning into the plan output stream, where the run's reader will see it. Warn-only: the run
   * continues, but a false success is no longer silent. Soft-fails.
   */
  private async warnOnWorkspacePreflight(params: {
    readonly driver: WorkflowConfigRunner;
    readonly planId: string;
    readonly workingDirectory: string;
  }): Promise<void> {
    const { driver, planId, workingDirectory } = params;

    try {
      const warnings = this.planRunWorkspacePreflightService.check({
        driver,
        workingDirectory,
      });
      if (warnings.length === 0) {
        return;
      }

      const content = [
        `⚠️  Workspace preflight found ${warnings.length} problem(s) in ${workingDirectory} (driver: ${driver}). MCP-dependent work may silently do nothing.`,
        ...warnings.map((warning) => `- ${warning}`),
      ].join('\n');

      this.logger.warn(content, PlanRunWorkspaceService.name);

      await this.planOutputStreamRepository.create({
        content,
        iteration: null,
        planId,
      });
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
      const latest = await this.planRunsRepository.findRunById(run.id);
      await this.planRunsRepository.setRunConfigSnapshotWorkspace(run.id, {
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

    const worktreeName = jobData.tuning?.worktreeName?.trim();
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
          `repository root could be resolved from this process (checked OPENTHROTTLE_PLAN_RUN_OT_ROOT, ` +
          `WORKSPACE_ROOT, and a walk up from this process's cwd for the ` +
          `${OPENTHROTTLE_WORKSPACE_MARKER} marker). Pass a checkoutId, repositoryId, or ` +
          `workingDirectory when enqueuing this plan run, or set WORKSPACE_ROOT/OPENTHROTTLE_PLAN_RUN_OT_ROOT ` +
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
      return await this.planRunsRepository.findByQueueNameAndBullmqJobId(
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
   * directory the agent runs in (`configCwd`, the plan-run worktree when there is one) and returns
   * the injected skill names, saying how many in plan output. Returns empty when the run is inside
   * the OT monorepo, the acting user cannot be resolved, the BASE checkout is not opted in
   * (`repository_checkouts.foreign_skill_injection_enabled`, default false), or on any failure.
   *
   * The opt-in is read from `(actorUserId, baseCheckoutCwd)` — the row the settings switch flips —
   * never from the worktree's own row, which is created during this run and defaults to off. The
   * agent-config trust posture does not gate it: these are OpenThrottle's skills, not the repo's.
   * Idempotent; soft-fails so a problem never aborts the orchestrator.
   */
  private async maybeInjectForeignSkills(params: {
    readonly baseCheckoutCwd: string;
    readonly configCwd: string;
    readonly planId: string;
    readonly run: PlanRun | null;
  }): Promise<readonly string[]> {
    const { baseCheckoutCwd, configCwd, planId, run } = params;
    const foreign = resolveForeignWorkspaceContext(configCwd, process.env);
    if (!foreign.isForeign || foreign.openThrottleRoot === undefined) {
      return [];
    }

    const actorUserId = run?.actorUserId?.trim();
    if (actorUserId === undefined || actorUserId === '') {
      // Opt-in requires a resolvable user to read the per-user flag; no actor => treat as off.
      return [];
    }

    let injectedNames: readonly string[];
    try {
      const checkout =
        await this.repositoryCheckoutsRepository.findByUserAndPath(
          actorUserId,
          baseCheckoutCwd,
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
      injectedNames = result.injectedNames;
    } catch (error) {
      this.logger.warn(
        `Foreign-skill injection failed for ${configCwd}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return [];
    }

    await this.narrateInjectedSkills({
      count: injectedNames.length,
      planId,
      workingDirectory: configCwd,
    });
    return injectedNames;
  }

  /**
   * @description One plan_output line naming how many OpenThrottle skills a run's directory got, so
   * "the worker could not find /x" is diagnosable from the run. Silent when none. Soft-fails.
   */
  private async narrateInjectedSkills(params: {
    readonly count: number;
    readonly planId: string;
    readonly workingDirectory: string;
  }): Promise<void> {
    const { count, planId, workingDirectory } = params;
    if (count === 0) {
      return;
    }

    const noun = count === 1 ? 'skill' : 'skills';
    const content = `🧩 Injected ${count} OpenThrottle ${noun} into ${workingDirectory}`;
    try {
      await this.planOutputStreamRepository.create({
        content,
        iteration: null,
        planId,
      });
    } catch (error) {
      this.logger.warn(
        `Soft-fail narrating injected skills for plan ${planId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        PlanRunWorkspaceService.name,
      );
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
