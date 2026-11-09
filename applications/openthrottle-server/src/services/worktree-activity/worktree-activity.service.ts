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
 * One exception, and it is why `runMonitored` exists: a run that does not heartbeat (migration 110)
 * counts as live on its status alone, because there is no timer to read. RUNNING is then a CLAIM
 * rather than a verified fact — the agent may have died hours ago — so classification reports how
 * much the claim is worth instead of quietly presenting the two cases identically.
 *
 * Paths are matched through registered checkout ids rather than string comparison, and discovery
 * indexes those checkouts by symlink-resolved real path — so a symlinked worktree root cannot make
 * a running worktree look idle.
 *
 * Discovery itself — the git and filesystem scan — is cached per user for
 * {@link DISCOVERY_CACHE_TTL_MS}, and concurrent reads share one scan. The live-run lookup is NOT
 * cached: it is one indexed query, and it is the half that changes on its own. Anything that changes
 * a user's checkouts or worktrees through OpenThrottle calls {@link WorktreeActivityService.invalidate}.
 * Expensive per-worktree verdicts derived from a scan can ride along with it through
 * {@link WorktreeActivityService.memoizeVerdict}.
 */
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRun } from '@openthrottle/nestjs-repositories';
import {
  PlanRunsService,
  STALE_CUTOFF_MS,
} from '@openthrottle/nestjs-repositories';

import { WORKTREE_DISCOVERY_PROBLEM } from '../worktree-discovery/worktree-discovery.constants.ts';
import { WorktreeDiscoveryService } from '../worktree-discovery/worktree-discovery.service.ts';
import type {
  DiscoveredWorktree,
  WorktreeDiscoveryProblem,
  WorktreeDiscoveryResult,
} from '../worktree-discovery/worktree-discovery.types.ts';
import { DISCOVERY_CACHE_TTL_MS } from './worktree-activity.constants.ts';
import type {
  CachedDiscovery,
  DiscoverAndClassifyOptions,
  WorktreeActivityResult,
} from './worktree-activity.types.ts';
import { classifyWorktree } from './worktree-activity.utils.ts';

@Injectable()
export class WorktreeActivityService {
  private readonly name = 'worktree-activity';

  /**
   * One entry per user: the scan's promise (shared by concurrent readers while it runs) and when it
   * started. A rejected scan is evicted rather than cached; discovery never rejects by contract, so
   * that is belt and braces.
   */
  private readonly discoveries = new Map<string, CachedDiscovery>();

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
  async discoverAndClassify(
    userId: string,
    options: DiscoverAndClassifyOptions = { fresh: false },
  ): Promise<WorktreeActivityResult> {
    const discovery = await this.discover(userId, options.fresh);
    const problems = [...discovery.problems];
    const warnings = [...discovery.warnings];

    const liveRuns = await this.liveRunsByCheckoutId(
      discovery.worktrees,
      problems,
      warnings,
    );

    return {
      droppedCount: discovery.droppedCount,
      missingCheckouts: discovery.missingCheckouts,
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
   * @description Drops the user's cached discovery so the next read rescans. Call it after anything
   * that adds, removes or re-registers one of the user's checkouts or worktrees.
   */
  invalidate(userId: string): void {
    this.discoveries.delete(userId);
  }

  /**
   * @description Computes a per-worktree verdict once per cached scan and reuses it until that scan
   * expires, is refreshed or is invalidated. With no live cached scan for the user it just computes:
   * there is nothing to tie the answer's lifetime to. A rejected computation is not kept.
   */
  memoizeVerdict(
    userId: string,
    key: string,
    compute: () => Promise<boolean>,
  ): Promise<boolean> {
    const entry = this.discoveries.get(userId);
    if (
      entry === undefined ||
      Date.now() - entry.startedAt >= DISCOVERY_CACHE_TTL_MS
    ) {
      return compute();
    }

    const existing = entry.verdicts.get(key);
    if (existing !== undefined) return existing;

    const verdict = compute();
    entry.verdicts.set(key, verdict);
    void verdict.catch(() => {
      if (entry.verdicts.get(key) === verdict) entry.verdicts.delete(key);
    });
    return verdict;
  }

  /** The user's discovery: the cached scan while it is fresh, otherwise a new one. */
  private discover(
    userId: string,
    fresh: boolean,
  ): Promise<WorktreeDiscoveryResult> {
    const now = Date.now();
    const cached = this.discoveries.get(userId);
    if (
      !fresh &&
      cached !== undefined &&
      now - cached.startedAt < DISCOVERY_CACHE_TTL_MS
    ) {
      return cached.result;
    }

    const result = this.discoveryService.discover(userId);
    const entry: CachedDiscovery = {
      result,
      startedAt: now,
      verdicts: new Map(),
    };
    this.discoveries.set(userId, entry);
    void result.catch(() => {
      // Only evict our own entry: an invalidate + rescan may already have replaced it.
      if (this.discoveries.get(userId) === entry) {
        this.discoveries.delete(userId);
      }
    });
    return result;
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
