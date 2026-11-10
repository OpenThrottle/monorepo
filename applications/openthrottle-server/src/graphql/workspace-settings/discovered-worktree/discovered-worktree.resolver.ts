/**
 * @description Per-worktree fields of `DiscoveredWorktreeObject` that cost a probe of their own.
 *
 * `safeToRemove` runs every teardown guard against the worktree (a database lookup plus several git
 * calls). It used to be computed eagerly for every plan-run worktree inside `discoveredWorktrees`,
 * whether or not the client selected it, which added ~400ms to every /settings/repositories load.
 * As a field resolver it costs nothing unless selected, the git-status half is skipped outright
 * when discovery has already seen the worktree dirty, and the verdict is reused for as long as the
 * user's cached scan lives (WorktreeActivityService.memoizeVerdict) — a cache-hit page load answers
 * it without touching git.
 */

import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import { PlanRunWorktreeTeardownService } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import {
  isPlanRunWorktreeName,
  primaryCheckoutFromCommonDir,
} from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.utils.ts';
import { WorktreeActivityService } from '../../../services/worktree-activity/worktree-activity.service.ts';
import { DiscoveredWorktreeObject } from '../discovered-worktrees.object.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a).
// Field resolvers on a DiscoveredWorktreeObject that only the settings:read-gated discoveredWorktrees
// query produces, for the caller's own worktrees.

@Resolver(() => DiscoveredWorktreeObject)
export class DiscoveredWorktreeResolver {
  constructor(
    private readonly activityService: WorktreeActivityService,
    private readonly teardownService: PlanRunWorktreeTeardownService,
  ) {}

  /**
   * @description Whether the page may offer a plan-run worktree as safe to remove: registered, and
   * every teardown guard passes right now. Never true for any other worktree; never throws.
   * removePlanRunWorktree re-runs every guard itself, so this is an offer, not an authorization —
   * which is why a verdict as old as the cached scan is acceptable.
   */
  @ResolveField(() => Boolean, {
    description: `True when this is a server-provisioned plan-run worktree that removePlanRunWorktree would remove as of the last scan: registered, clean, nothing unpushed, and no live run on it. Reused for as long as the scan is cached; removePlanRunWorktree re-checks every guard before removing anything. Always false for any other worktree.`,
  })
  async safeToRemove(
    @CurrentUser('sub') userId: string,
    @Parent() worktree: DiscoveredWorktreeObject,
  ): Promise<boolean> {
    if (worktree.checkoutId === null) return false;
    if (!isPlanRunWorktreeName(worktree.path)) return false;
    // Uncommitted changes fail the teardown's dirty guard; no need to run `git status` again.
    if (worktree.dirty === true) return false;

    const baseCheckoutPath = primaryCheckoutFromCommonDir(worktree.commonDir);
    if (baseCheckoutPath === null) return false;

    return this.activityService.memoizeVerdict(
      userId,
      `safeToRemove:${worktree.path}`,
      async () => {
        const verdict = await this.teardownService.assess({
          baseCheckoutPath,
          worktreePath: worktree.path,
        });
        return verdict.outcome === PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE;
      },
    );
  }
}
