import type { WorktreeRootSource } from '../worktree-root/worktree-root.types.ts';
import type {
  MISSING_CHECKOUT_REASON,
  WORKTREE_DISCOVERY_PROBLEM,
  WORKTREE_DISCOVERY_SOURCE,
} from './worktree-discovery.constants.ts';

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

export type WorktreeDiscoverySource =
  (typeof WORKTREE_DISCOVERY_SOURCE)[keyof typeof WORKTREE_DISCOVERY_SOURCE];
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

/** The union of {@link MISSING_CHECKOUT_REASON} values. */
export type MissingCheckoutReason =
  (typeof MISSING_CHECKOUT_REASON)[keyof typeof MISSING_CHECKOUT_REASON];

/**
 * A registered worktree checkout that discovery could not match to a live worktree. Reported, never
 * acted on: removing the row is a separate, explicit mutation.
 */
export interface MissingWorktreeCheckout {
  readonly checkoutId: string;
  /** The path as registered — it no longer resolves, so there is no real path to report. */
  readonly path: string;
  readonly reason: MissingCheckoutReason;
  readonly repositoryId: string;
}

/** One resolved worktree root and what the depth-1 scan of it found. */
export interface ScannedWorktreeRoot {
  /**
   * The configured root this directory sits under, before OpenThrottle joins `<org>/<repo>` onto
   * it — what a person set (or the default), and so what the page should name. Several scanned roots
   * share one base root whenever their repositories share a configured root.
   */
  readonly baseRoot: string;
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
   * Registered worktree checkouts with no live worktree behind them, ordered by path. Matched against
   * the full live set before the cap, so a capped scan never reports a live worktree as missing.
   */
  readonly missingCheckouts: readonly MissingWorktreeCheckout[];
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
   * @deprecated Use {@link scannedRoots} and each root's `baseRoot`. This is ONE repository's
   * `<root>/<org>/<repo>` folder — the first primary's — not the configured root.
   */
  readonly worktreeRoot: string | null;
  readonly worktrees: readonly DiscoveredWorktree[];
}
