/**
 * @description Soft-fail upsert of a linked worktree checkout for a plan run,
 * then write `plan_runs.checkout_id` (and `branch` from HEAD) to that worktree —
 * overwriting a scheduling-time primary checkout when the run moved into a
 * worktree. Shared by the GraphQL mutation, the in-process Ralph orchestrator
 * run-start hook, and the CLI `workflow-ralph` run-start hook. Shell
 * provision-time registration from `worktree:new` / `setup_worktree.ts`
 * (service-account callback) is explicitly deferred — see
 * docs/monorepo/git-worktree-setup-timing.md.
 */
import { basename } from 'node:path';

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type PlanRun,
  PlanRunsService,
  RepositoriesService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';

import { RepositoryInspectionService } from '../../graphql/repository-inspection/repository-inspection.service.ts';
import type { RegisterPlanRunWorktreeCheckoutParams } from './plan-run-worktree-checkout.types.ts';

@Injectable()
export class PlanRunWorktreeCheckoutService {
  private readonly name = 'plan-run-worktree-checkout';

  constructor(
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly inspectionService: RepositoryInspectionService,
    private readonly logger: LoggerService,
    private readonly planRunsService: PlanRunsService,
    private readonly repositoriesService: RepositoriesService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Registers the resolved path as a managed worktree checkout when
   * eligible and points `plan_runs.checkout_id` + `branch` at that worktree
   * (overwrites a prior scheduling checkout). Soft-fails (logs, returns the
   * unchanged run) on any registration error so the caller can continue the
   * agent turn. No-ops when the path is not a linked worktree — leaving a
   * primary checkout already recorded at enqueue alone.
   */
  async register(
    params: RegisterPlanRunWorktreeCheckoutParams,
  ): Promise<PlanRun | null> {
    const { filesystemPath, planRunId, userId } = params;

    try {
      const run = await this.planRunsService.findById(planRunId);
      if (run === null) {
        this.logger.warn(
          `[${this.name}] plan run ${planRunId} not found; skipping worktree checkout registration`,
        );
        return null;
      }

      const snapshot = await this.inspectionService.scan(filesystemPath);
      if (!snapshot.git.isLinkedWorktree) {
        this.logger.debug(
          `[${this.name}] path is not a linked worktree (${filesystemPath}); skipping registration for run ${planRunId}`,
        );
        return run;
      }

      const repositoryId = await this.resolveRepositoryId(
        run,
        snapshot.git.normalizedRemoteUrl,
      );
      if (repositoryId === null) {
        this.logger.warn(
          `[${this.name}] could not resolve repositoryId for run ${planRunId} at ${filesystemPath}; leaving checkout_id unchanged`,
        );
        return run;
      }

      const checkout = await this.checkoutsService.upsertWorktreeCheckout(
        userId,
        {
          displayName: basename(filesystemPath),
          filesystemPath,
          repositoryId,
        },
      );

      const updated = await this.planRunsService.setCheckoutAndBranch(
        planRunId,
        {
          branch: snapshot.git.currentBranch,
          checkoutId: checkout.id,
        },
      );

      return updated ?? run;
    } catch (error) {
      this.logger.warn(
        `[${this.name}] soft-fail registering worktree checkout for run ${planRunId} at ${filesystemPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.planRunsService.findById(planRunId);
    }
  }

  /**
   * @description Prefer `run_config_snapshot.workspace.repositoryId` when it
   * names an existing repository; otherwise resolve from the path's normalized
   * git remote. Returns null when neither works.
   */
  private async resolveRepositoryId(
    run: PlanRun,
    normalizedRemoteUrl: string | null,
  ): Promise<string | null> {
    const fromSnapshot = run.runConfigSnapshot?.workspace?.repositoryId?.trim();
    if (fromSnapshot !== undefined && fromSnapshot !== '') {
      const known = await this.repositoriesService.findById(fromSnapshot);
      if (known !== null) {
        return known.id;
      }
      this.logger.debug(
        `[${this.name}] snapshot repositoryId ${fromSnapshot} not found; falling back to git remote`,
      );
    }

    if (normalizedRemoteUrl === null || normalizedRemoteUrl === '') {
      return null;
    }

    const byRemote =
      await this.repositoriesService.findByNormalizedRemoteUrl(
        normalizedRemoteUrl,
      );
    return byRemote?.id ?? null;
  }
}
