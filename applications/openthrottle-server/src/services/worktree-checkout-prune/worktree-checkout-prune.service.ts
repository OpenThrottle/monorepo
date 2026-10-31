/**
 * @description Deletes `repository_checkouts` rows of kind `worktree` whose worktree is gone — the
 * cleanup half of discovery's `missingCheckouts`. Rows only: nothing here touches the filesystem.
 *
 * The client's list is a request, never evidence. Every guard is re-evaluated server-side at call
 * time, in this order, and the first that applies wins:
 *   1. not owned by the caller → NOT_FOUND
 *   2. a primary checkout → SKIPPED_PRIMARY (and the delete itself is kind-scoped as well)
 *   3. an unsettled plan run points at it → SKIPPED_ACTIVE_RUN
 *   4. the path is a live linked worktree → SKIPPED_LIVE (the same predicate discovery uses)
 *   5. otherwise the row is deleted → PRUNED
 *
 * Referencing rows keep their history: every foreign key to repository_checkouts is ON DELETE SET
 * NULL, so a settled run simply loses its "open in editor" link to a worktree that no longer exists.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckout } from '@openthrottle/nestjs-repositories';
import {
  PlanRunsService,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';

import { realPath } from '../paths/real-path.ts';
import { isLinkedWorktreeDirectory } from '../worktree-discovery/linked-worktree.ts';
import type {
  DeregisterWorktreeCheckoutResult,
  PruneWorktreeCheckoutResult,
} from './worktree-checkout-prune.types.ts';
import { PRUNE_WORKTREE_CHECKOUT_OUTCOME } from './worktree-checkout-prune.types.ts';

/** Matches the discovery cap: a page never shows more rows than this to prune at once. */
export const MAX_PRUNE_CHECKOUT_IDS = 200;

const WORKTREE_KIND = 'worktree';

@Injectable()
export class WorktreeCheckoutPruneService {
  private readonly name = 'worktree-checkout-prune';

  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly planRunsService: PlanRunsService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Prunes the given checkout ids for the user, one outcome per distinct id in request
   * order. More than {@link MAX_PRUNE_CHECKOUT_IDS} distinct ids is a malformed request and throws.
   */
  async pruneByIds(
    userId: string,
    checkoutIds: readonly string[],
  ): Promise<PruneWorktreeCheckoutResult[]> {
    const ids = [...new Set(checkoutIds)];
    if (ids.length > MAX_PRUNE_CHECKOUT_IDS) {
      throw new BadRequestException(
        `at most ${MAX_PRUNE_CHECKOUT_IDS} checkouts can be pruned at once`,
      );
    }
    const checkouts = await Promise.all(
      ids.map((id) => this.checkoutsService.findByIdForUser(id, userId)),
    );
    const found = checkouts.filter(
      (checkout): checkout is RepositoryCheckout => checkout !== null,
    );

    const busy = await this.checkoutIdsWithUnsettledRuns(found);

    return Promise.all(
      ids.map((id, index) =>
        this.pruneOne(userId, id, checkouts[index] ?? null, busy),
      ),
    );
  }

  /**
   * @description Deregisters the caller's worktree checkout at a filesystem path — the call a
   * teardown makes right after `git worktree remove`, when the path is all it has. Looked up by the
   * path as given and by its real path, since registration may have stored either; then pruned
   * through exactly the same guards as {@link pruneByIds}, so a teardown can never delete a row a
   * live worktree or an unsettled run still needs.
   */
  async pruneByPath(
    userId: string,
    filesystemPath: string,
  ): Promise<DeregisterWorktreeCheckoutResult> {
    const candidates = [...new Set([filesystemPath, realPath(filesystemPath)])];
    const matches = await Promise.all(
      candidates.map((path) =>
        this.checkoutsService.findByUserAndPath(userId, path),
      ),
    );
    const checkout = matches.find((match) => match !== null) ?? null;

    if (checkout === null) {
      return {
        checkoutId: null,
        outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND,
        path: filesystemPath,
      };
    }

    const [result] = await this.pruneByIds(userId, [checkout.id]);
    return {
      checkoutId: checkout.id,
      outcome: result?.outcome ?? PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND,
      path: checkout.filesystemPath,
    };
  }

  private async pruneOne(
    userId: string,
    id: string,
    checkout: RepositoryCheckout | null,
    busy: ReadonlySet<string>,
  ): Promise<PruneWorktreeCheckoutResult> {
    if (checkout === null) {
      return {
        checkoutId: id,
        outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND,
        path: null,
      };
    }

    const path = checkout.filesystemPath;
    const result = (
      outcome: PruneWorktreeCheckoutResult['outcome'],
    ): PruneWorktreeCheckoutResult => ({ checkoutId: id, outcome, path });

    if (checkout.kind !== WORKTREE_KIND) {
      return result(PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_PRIMARY);
    }
    if (busy.has(id)) {
      return result(PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_ACTIVE_RUN);
    }
    if (isLinkedWorktreeDirectory(realPath(path))) {
      return result(PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_LIVE);
    }

    const deleted = await this.checkoutsService.deleteWorktreeCheckout(
      userId,
      id,
    );
    if (!deleted) return result(PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND);

    this.logger.log(`pruned stale worktree checkout ${id} (${path})`);
    return result(PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED);
  }

  private async checkoutIdsWithUnsettledRuns(
    checkouts: readonly RepositoryCheckout[],
  ): Promise<Set<string>> {
    const runs = await this.planRunsService.findUnsettledRunsByCheckoutIds(
      checkouts
        .filter((checkout) => checkout.kind === WORKTREE_KIND)
        .map((checkout) => checkout.id),
    );
    return new Set(
      runs
        .map((run) => run.checkoutId)
        .filter((id): id is string => id !== null),
    );
  }
}
