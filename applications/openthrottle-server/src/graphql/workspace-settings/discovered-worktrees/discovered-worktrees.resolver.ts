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
 *
 * The scan is cached per user by WorktreeActivityService; the mutations here invalidate it, and the
 * `refresh` argument bypasses it. `safeToRemove` is resolved per worktree by
 * DiscoveredWorktreeResolver, so it only costs anything when a client selects it.
 */

import { NotFoundException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { RepositoryCheckoutsService } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import { PlanRunWorktreeTeardownService } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import { WorktreeActivityService } from '../../../services/worktree-activity/worktree-activity.service.ts';
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
    description: `Git worktrees that exist on disk for the authenticated user's repositories, whether or not OpenThrottle provisioned them, each classified RUNNING / DIRTY / IDLE. Read-only: nothing here creates, prunes or removes a worktree. The on-disk scan is reused for a few seconds per user (pass refresh to force one); live-run classification is always current. Never throws — an unreadable root or a failed git probe becomes a warning on the payload.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoveredWorktrees(
    @CurrentUser('sub') userId: string,
    @Args('refresh', {
      defaultValue: false,
      description: `Rescan now instead of reusing a scan from the last few seconds. The scan is cached briefly per user, and changes made through OpenThrottle (adding, cloning, refreshing, pruning or removing) already invalidate it — pass this for an explicit user-requested refresh, not on every load.`,
      nullable: true,
      type: () => Boolean,
    })
    refresh: boolean | null = false,
  ): Promise<DiscoveredWorktreesObject> {
    const result = await this.activityService.discoverAndClassify(userId, {
      fresh: refresh === true,
    });

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
      worktrees: result.worktrees.map((worktree) => ({
        activity: worktree.activity,
        branch: worktree.branch,
        checkoutId: worktree.checkoutId,
        commonDir: worktree.commonDir,
        dirty: worktree.dirty,
        name: worktree.name,
        path: worktree.path,
        planId: worktree.planId,
        planRunId: worktree.planRunId,
        repositoryId: worktree.repositoryId,
        runMonitored: worktree.runMonitored,
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
    this.activityService.invalidate(userId);
    return {
      results: results.map((entry) => ({
        checkoutId: entry.checkoutId,
        outcome: entry.outcome,
        path: entry.path,
      })),
    };
  }

  @Mutation(() => RemovePlanRunWorktreePayloadObject, {
    description: `Remove one server-provisioned plan-run worktree from disk through the ot-worktree destroy action (destroy.sh, never a pnpm script, so it works in any repo): the repo's teardown hook runs, the directory and its checkout record go, and the branch is kept. Never forced — a primary checkout, a worktree OpenThrottle did not provision, a dirty or unpushed tree, or one an unsettled run still points at is kept and the outcome says why.`,
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
    this.activityService.invalidate(userId);
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
}
