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

import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { WorktreeActivityService } from '../../services/worktree-activity/worktree-activity.service';
import { DiscoveredWorktreesObject } from './discovered-worktrees.object';

@Resolver(() => DiscoveredWorktreesObject)
@UseGuards(GqlPermissionsGuard)
export class DiscoveredWorktreesResolver {
  constructor(private readonly activityService: WorktreeActivityService) {}

  @Query(() => DiscoveredWorktreesObject, {
    description: `Git worktrees that exist on disk for the authenticated user's repositories, whether or not OpenThrottle provisioned them, each classified RUNNING / DIRTY / IDLE. Read-only: nothing here creates, prunes or removes a worktree. Runs live on every request and never throws — an unreadable root or a failed git probe becomes a warning on the payload.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async discoveredWorktrees(
    @CurrentUser('sub') userId: string,
  ): Promise<DiscoveredWorktreesObject> {
    const result = await this.activityService.discoverAndClassify(userId);

    return {
      droppedCount: result.droppedCount,
      rootSource: result.rootSource,
      scannedAt: result.scannedAt,
      warnings: [...result.warnings],
      worktreeRoot: result.worktreeRoot,
      worktrees: result.worktrees.map((worktree) => ({
        activity: worktree.activity,
        branch: worktree.branch,
        checkoutId: worktree.checkoutId,
        name: worktree.name,
        path: worktree.path,
        planId: worktree.planId,
        planRunId: worktree.planRunId,
        repositoryId: worktree.repositoryId,
        unregistered: worktree.unregistered,
      })),
    };
  }
}
