/**
 * @description GraphQL surface for on-disk worktree discovery.
 *
 * This is a TOP-LEVEL query rather than a field on `RepositoryObject` on purpose. Discovery is one
 * bounded scan for the whole user: it resolves the worktree root once, runs `git worktree list`
 * once per primary checkout, and probes each worktree once. A `RepositoryObject.discoveredWorktrees`
 * field would re-run that fan-out per repository row on the page — N times the git calls for the
 * same answer — and would have nowhere to report the scan-level facts (`worktreeRoot`,
 * `rootSource`, `warnings`, the cap). The repositories index route already fires a single query, so
 * the loader requests this alongside `workspaceRepositories` and the client stitches worktrees onto
 * their parent rows by `repositoryId`.
 */

import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import { PlanRunWorktreeTeardownService } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import {
  isPlanRunWorktreeName,
  primaryCheckoutFromCommonDir,
} from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.utils.ts';
import { WorktreeActivityService } from '../../../services/worktree-activity/worktree-activity.service.ts';
import type { ClassifiedWorktree } from '../../../services/worktree-activity/worktree-activity.types.ts';
import { WorktreeCheckoutPruneService } from '../../../services/worktree-checkout-prune/worktree-checkout-prune.service.ts';
import { DiscoveredWorktreesObject } from '../discovered-worktrees.object.ts';
import { PruneWorktreeCheckoutsInput } from '../prune-worktree-checkouts.input.ts';
import { PruneWorktreeCheckoutsPayloadObject } from '../prune-worktree-checkouts.object.ts';
import { RemovePlanRunWorktreePayloadObject } from '../remove-plan-run-worktree.object.ts';

@Resolver(() => DiscoveredWorktreesObject)
@UseGuards(GqlPermissionsGuard)
export class DiscoveredWorktreesResolver {
  constructor(
    private readonly activityService: WorktreeActivityService,
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly pruneService: WorktreeCheckoutPruneService,
    private readonly teardownService: PlanRunWorktreeTeardownService,
  ) {}

  @Query(() => DiscoveredWorktreesObject, {
    description: `Git worktrees that exist on disk for the authenticated user's repositories, whether or not OpenThrottle provisioned them, each classified RUNNING / DIRTY / IDLE. Read-only: nothing here creates, prunes or removes a worktree. Runs live on every request and never throws — an unreadable root or a failed git probe becomes a warning on the payload.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoveredWorktrees(
    @CurrentUser('sub') userId: string,
  ): Promise<DiscoveredWorktreesObject> {
    const result = await this.activityService.discoverAndClassify(userId);
    const safeToRemove = await Promise.all(
      result.worktrees.map((worktree) => this.isSafeToRemove(worktree)),
    );

    return {
      droppedCount: result.droppedCount,
      missingCheckouts: result.missingCheckouts.map((entry) => ({
        checkoutId: entry.checkoutId,
        path: entry.path,
        reason: entry.reason,
        repositoryId: entry.repositoryId,
      })),
      problems: result.problems.map((entry) => ({
        detail: entry.detail,
        kind: entry.kind,
        path: entry.path,
        repositoryId: entry.repositoryId,
      })),
      rootSource: result.rootSource,
      scannedAt: result.scannedAt,
      scannedRoots: result.scannedRoots.map((root) => ({
        baseRoot: root.baseRoot,
        exists: root.exists,
        path: root.path,
        source: root.source,
        worktreeCount: root.worktreeCount,
      })),
      warnings: [...result.warnings],
      worktreeRoot: result.worktreeRoot,
      worktrees: result.worktrees.map((worktree, index) => ({
        activity: worktree.activity,
        branch: worktree.branch,
        checkoutId: worktree.checkoutId,
        name: worktree.name,
        path: worktree.path,
        planId: worktree.planId,
        planRunId: worktree.planRunId,
        repositoryId: worktree.repositoryId,
        runMonitored: worktree.runMonitored,
        safeToRemove: safeToRemove[index] ?? false,
        unregistered: worktree.unregistered,
      })),
    };
  }

  @Mutation(() => PruneWorktreeCheckoutsPayloadObject, {
    description: `Delete registered worktree checkout rows whose worktree is gone — the cleanup for discoveredWorktrees.missingCheckouts. Rows only: never touches the filesystem and never deletes a primary checkout. Each id is re-checked server-side and skipped, not failed, when its path is a live worktree or an unsettled plan run still points at it.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async pruneWorktreeCheckouts(
    @CurrentUser('sub') userId: string,
    @Args('input', { type: () => PruneWorktreeCheckoutsInput })
    input: PruneWorktreeCheckoutsInput,
  ): Promise<PruneWorktreeCheckoutsPayloadObject> {
    const results = await this.pruneService.pruneByIds(
      userId,
      input.checkoutIds,
    );
    return {
      results: results.map((entry) => ({
        checkoutId: entry.checkoutId,
        outcome: entry.outcome,
        path: entry.path,
      })),
    };
  }

  @Mutation(() => RemovePlanRunWorktreePayloadObject, {
    description: `Remove one server-provisioned plan-run worktree from disk through pnpm run worktree:remove: the repo's teardown hook runs, the directory and its checkout record go, and the branch is kept. Never forced — a primary checkout, a worktree OpenThrottle did not provision, a dirty or unpushed tree, or one an unsettled run still points at is kept and the outcome says why.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async removePlanRunWorktree(
    @CurrentUser('sub') userId: string,
    @Args('checkoutId', { type: () => ID }) checkoutId: string,
  ): Promise<RemovePlanRunWorktreePayloadObject> {
    const checkout = await this.checkoutsService.findByIdForUser(
      checkoutId,
      userId,
    );
    if (checkout === null) {
      throw new NotFoundException(`No checkout ${checkoutId} for this user`);
    }

    const path = checkout.filesystemPath;
    const baseCheckoutPath =
      await this.teardownService.resolveBaseCheckoutPath(path);
    if (baseCheckoutPath === null) {
      return {
        branch: null,
        checkoutId,
        detail: 'its primary checkout could not be resolved',
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED,
        path,
      };
    }

    const result = await this.teardownService.teardown({
      baseCheckoutPath,
      worktreePath: path,
    });
    if (result.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED) {
      return {
        branch: result.branch,
        checkoutId,
        detail: null,
        outcome: result.outcome,
        path,
      };
    }
    return {
      branch: null,
      checkoutId,
      detail: result.detail,
      outcome: result.outcome,
      path,
    };
  }

  /**
   * @description Whether the page may offer a plan-run worktree as safe to remove: registered, and
   * every teardown guard passes right now. Never true for any other worktree; never throws.
   */
  private async isSafeToRemove(worktree: ClassifiedWorktree): Promise<boolean> {
    if (worktree.checkoutId === null) return false;
    if (!isPlanRunWorktreeName(worktree.path)) return false;

    const baseCheckoutPath = primaryCheckoutFromCommonDir(worktree.commonDir);
    if (baseCheckoutPath === null) return false;

    const verdict = await this.teardownService.assess({
      baseCheckoutPath,
      worktreePath: worktree.path,
    });
    return verdict.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE;
  }
}
