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

/**
 * Why a discovery scan is less than complete, or what it noticed on the way. Deliberately NOT a TS
 * enum (`.agents/rules/`): an `as const` object keeps the values inlineable and the union derivable.
 *
 * The kind is the contract: the server decides WHAT happened, the UI decides how loud it is. A
 * state that is merely the healthy default — a repository that has no worktrees yet — is not a
 * problem at all and must emit nothing.
 */
export const WORKTREE_DISCOVERY_PROBLEM = {
  /** More worktrees exist than the hard cap; the overflow was dropped. */
  CAP_EXCEEDED: 'cap-exceeded',
  /** The user's registered checkouts could not be listed, so the scan had nothing to scan from. */
  CHECKOUT_LIST_FAILED: 'checkout-list-failed',
  /**
   * A registered checkout path is not a git repository at all. Attributable to one repository via
   * {@link WorktreeDiscoveryProblem.repositoryId}, so the UI badges the row rather than the page.
   */
  NOT_A_GIT_REPO: 'not-a-git-repo',
  /** A read-only git probe against an existing directory failed. The genuinely degraded case. */
  PROBE_FAILED: 'probe-failed',
  /**
   * A worktree root exists but could not be read (EACCES and friends). A root that simply does not
   * exist is NOT this — it is the normal state of a repository with no worktrees.
   */
  ROOT_UNREADABLE: 'root-unreadable',
  /**
   * `git worktree list` still reports a worktree whose directory is gone. Actionable exactly once,
   * with `git worktree prune`; the path is never probed.
   */
  STALE_WORKTREE_ENTRY: 'stale-worktree-entry',
} as const;

/** The union of {@link WORKTREE_DISCOVERY_PROBLEM} values. */
export type WorktreeDiscoveryProblemKind =
  (typeof WORKTREE_DISCOVERY_PROBLEM)[keyof typeof WORKTREE_DISCOVERY_PROBLEM];

/** One classified, non-fatal thing that happened during a scan. */
export interface WorktreeDiscoveryProblem {
  /**
   * The raw underlying message (errno text, git stderr). Kept for debugging and shown only behind a
   * disclosure — the user-facing sentence is derived from {@link kind}, never from this.
   */
  readonly detail: string;
  readonly kind: WorktreeDiscoveryProblemKind;
  /** The directory the problem is about, or null when it is not about one (the cap). */
  readonly path: string | null;
  /** Set only when the problem is attributable to one registered repository. */
  readonly repositoryId: string | null;
}

/** One resolved worktree root and what the depth-1 scan of it found. */
export interface ScannedWorktreeRoot {
  /**
   * Whether the directory is there at all. False is the ordinary state of a repository with no
   * worktrees yet — surfaced as data precisely so the UI can say so instead of listing an ENOENT.
   */
  readonly exists: boolean;
  readonly path: string;
  /** Which rung of the shared ladder resolved this root. */
  readonly source: WorktreeRootSource;
  /** Linked worktrees this root contributed. */
  readonly worktreeCount: number;
}

export interface WorktreeDiscoveryResult {
  /**
   * How many worktrees were found beyond the hard cap and therefore dropped. Always accompanied by
   * a warning — discovery never truncates silently.
   */
  readonly droppedCount: number;
  /**
   * Classified non-fatal problems. {@link warnings} is derived from this; new consumers read this.
   */
  readonly problems: readonly WorktreeDiscoveryProblem[];
  /** Which rung of the ladder produced {@link worktreeRoot}; null when no root was resolvable. */
  readonly rootSource: WorktreeRootSource | null;
  readonly scannedAt: string;
  /**
   * Every root the scan looked in, not just {@link worktreeRoot}. Several registered primaries can
   * resolve to different roots, and the page misrepresented that by naming only the first.
   */
  readonly scannedRoots: readonly ScannedWorktreeRoot[];
  /**
   * @deprecated Use {@link problems} — this is unclassified free text and cannot be presented
   * per-kind. Derived from {@link problems}, one formatted sentence each.
   */
  readonly warnings: readonly string[];
  /**
   * The resolved worktree root that was scanned. When several registered primaries resolve to
   * different roots, this is the first one; every root is still scanned.
   */
  readonly worktreeRoot: string | null;
  readonly worktrees: readonly DiscoveredWorktree[];
}
