/**
 * @description Shapes returned by {@link WorktreeDiscoveryService}. Raw on-disk facts only —
 * activity classification (RUNNING / DIRTY / IDLE) is layered on top by
 * WorktreeActivityService, which is the only thing allowed to say a worktree is "in progress".
 */

import type { WorktreeRootSource } from '../worktree-root/worktree-root.resolver';

/** One linked git worktree that exists on disk right now. */
export interface DiscoveredWorktree {
  /**
   * Number of commits the branch is ahead of its upstream, or null when there is no upstream (or
   * the probe failed). A classification signal, not a display value.
   */
  readonly aheadCount: number | null;
  readonly branch: string | null;
  /** Registered `repository_checkouts.id` at this path for this user, or null when unregistered. */
  readonly checkoutId: string | null;
  /**
   * Resolved `git rev-parse --git-common-dir` for the worktree — the shared git dir of the owning
   * repository. The grouping key for a worktree whose base checkout is not registered.
   */
  readonly commonDir: string | null;
  /** True when `git status --porcelain` was non-empty; null when the probe failed. */
  readonly dirty: boolean | null;
  /** Directory name (the worktree's `<name>`, which is also its branch suffix). */
  readonly name: string;
  /** Absolute, symlink-resolved path of the worktree. */
  readonly path: string;
  /** Owning repository when the path or its common dir maps to a registered repository. */
  readonly repositoryId: string | null;
  /** Which discovery source(s) surfaced this worktree; for diagnostics only. */
  readonly sources: readonly WorktreeDiscoverySource[];
}

/** Which of the two discovery sources surfaced a worktree. */
export const WORKTREE_DISCOVERY_SOURCE = {
  /** `git worktree list --porcelain` run in a registered primary checkout. */
  GIT_WORKTREE_LIST: 'git-worktree-list',
  /** Depth-1 scan of the resolved worktree root. */
  ROOT_SCAN: 'root-scan',
} as const;

export type WorktreeDiscoverySource =
  (typeof WORKTREE_DISCOVERY_SOURCE)[keyof typeof WORKTREE_DISCOVERY_SOURCE];

export interface WorktreeDiscoveryResult {
  /**
   * How many worktrees were found beyond the hard cap and therefore dropped. Always accompanied by
   * a warning — discovery never truncates silently.
   */
  readonly droppedCount: number;
  /** Which rung of the ladder produced {@link worktreeRoot}; null when no root was resolvable. */
  readonly rootSource: WorktreeRootSource | null;
  readonly scannedAt: string;
  /** Non-fatal problems. Every fs/git failure lands here rather than throwing. */
  readonly warnings: readonly string[];
  /**
   * The resolved worktree root that was scanned. When several registered primaries resolve to
   * different roots, this is the first one; every root is still scanned.
   */
  readonly worktreeRoot: string | null;
  readonly worktrees: readonly DiscoveredWorktree[];
}
