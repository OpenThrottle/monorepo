/**
 * @description Layers activity classification onto worktree discovery. The whole point of this
 * service is that "in progress" has a definition: a directory existing on disk NEVER means a
 * worktree is running.
 *
 * RUNNING requires a live `IN_PROGRESS` plan run pointed at the worktree's registered checkout —
 * live meaning its `COALESCE(last_heartbeat_at, created_at)` is inside `STALE_CUTOFF_MS`, the same
 * liveness expression the stale sweeper uses from the other side. A stale IN_PROGRESS row is a dead
 * run and falls through to DIRTY or IDLE.
 *
 * Paths are matched through registered checkout ids rather than string comparison, and discovery
 * indexes those checkouts by symlink-resolved real path — so a symlinked worktree root cannot make
 * a running worktree look idle.
 */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  PlanRunsService,
  STALE_CUTOFF_MS,
} from '@openthrottle/nestjs-repositories';
import { WorktreeDiscoveryService } from '../worktree-discovery/worktree-discovery.service';
import type {
  DiscoveredWorktree,
  WorktreeDiscoveryProblem,
} from '../worktree-discovery/worktree-discovery.types';
import { WORKTREE_DISCOVERY_PROBLEM } from '../worktree-discovery/worktree-discovery.types';
import type {
  ClassifiedWorktree,
  WorktreeActivityResult,
} from './worktree-activity.types';
import { WORKTREE_ACTIVITY } from './worktree-activity.types';

/**
 * @description The classification itself, as a pure function of the discovered git signals plus the
 * live run (if any), so the precedence reads in one place.
 */
export const classifyWorktree = (
  worktree: DiscoveredWorktree,
  liveRun: PlanRun | null,
): ClassifiedWorktree => {
  const unregistered = worktree.checkoutId === null;

  if (liveRun !== null) {
    return {
      ...worktree,
      activity: WORKTREE_ACTIVITY.RUNNING,
      planId: liveRun.planId,
      planRunId: liveRun.id,
      unregistered,
    };
  }

  // A failed status probe (dirty === null) is not evidence of cleanliness, but IDLE is still the
  // honest reading: nothing observed says otherwise, and the probe failure is already a warning.
  const hasUncommitted = worktree.dirty === true;
  const isAhead = (worktree.aheadCount ?? 0) > 0;

  return {
    ...worktree,
    activity:
      hasUncommitted || isAhead
        ? WORKTREE_ACTIVITY.DIRTY
        : WORKTREE_ACTIVITY.IDLE,
    planId: null,
    planRunId: null,
    unregistered,
  };
};

@Injectable()
export class WorktreeActivityService {
  private readonly name = 'worktree-activity';

  constructor(
    private readonly logger: LoggerService,
    private readonly discoveryService: WorktreeDiscoveryService,
    private readonly planRunsService: PlanRunsService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Discovers the user's on-disk worktrees and classifies each one. Non-fatal
   * throughout: a failure reading plan runs degrades every worktree to its git-only classification
   * plus a warning, never an error on the page.
   */
  async discoverAndClassify(userId: string): Promise<WorktreeActivityResult> {
    const discovery = await this.discoveryService.discover(userId);
    const problems = [...discovery.problems];
    const warnings = [...discovery.warnings];

    const liveRuns = await this.liveRunsByCheckoutId(
      discovery.worktrees,
      problems,
      warnings,
    );

    return {
      droppedCount: discovery.droppedCount,
      problems,
      rootSource: discovery.rootSource,
      scannedAt: discovery.scannedAt,
      scannedRoots: discovery.scannedRoots,
      warnings,
      worktreeRoot: discovery.worktreeRoot,
      worktrees: discovery.worktrees.map((worktree) =>
        classifyWorktree(
          worktree,
          worktree.checkoutId === null
            ? null
            : (liveRuns.get(worktree.checkoutId) ?? null),
        ),
      ),
    };
  }

  /**
   * Live IN_PROGRESS runs keyed by checkout id. Only a registered worktree can be RUNNING: a run's
   * `checkout_id` is how the server records where it executes, and the provisioning path always
   * registers the worktree it creates.
   */
  private async liveRunsByCheckoutId(
    worktrees: readonly DiscoveredWorktree[],
    problems: WorktreeDiscoveryProblem[],
    warnings: string[],
  ): Promise<Map<string, PlanRun>> {
    const byCheckoutId = new Map<string, PlanRun>();

    const checkoutIds = [
      ...new Set(
        worktrees
          .map((worktree) => worktree.checkoutId)
          .filter((id): id is string => id !== null),
      ),
    ];
    if (checkoutIds.length === 0) return byCheckoutId;

    try {
      const runs = await this.planRunsService.findLiveRunsByCheckoutIds(
        checkoutIds,
        new Date(Date.now() - STALE_CUTOFF_MS),
      );
      // Newest first from the query, so the first run seen per checkout wins.
      for (const run of runs) {
        if (run.checkoutId !== null && !byCheckoutId.has(run.checkoutId)) {
          byCheckoutId.set(run.checkoutId, run);
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      problems.push({
        detail: `live plan runs could not be read; worktrees are classified from git state only: ${detail}`,
        kind: WORKTREE_DISCOVERY_PROBLEM.PROBE_FAILED,
        path: null,
        repositoryId: null,
      });
      warnings.push(
        `could not read live plan runs; worktrees are classified from git state only: ${detail}`,
      );
    }

    return byCheckoutId;
  }
}
