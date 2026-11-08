/** Hard cap on rows returned. Overflow is counted and warned about, never silently dropped. */
export const MAX_DISCOVERED_WORKTREES = 200;
/** Which of the two discovery sources surfaced a worktree. */
export const WORKTREE_DISCOVERY_SOURCE = {
  /** `git worktree list --porcelain` run in a registered primary checkout. */
  GIT_WORKTREE_LIST: 'git-worktree-list',
  /** Depth-1 scan of the resolved worktree root. */
  ROOT_SCAN: 'root-scan',
} as const;

/**
 * Why a discovery scan is less than complete, or what it noticed on the way. Deliberately NOT a TS
 * enum (docs/monorepo/code-style.md): an `as const` object keeps the values inlineable and the
 * union derivable.
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
  /**
   * A directory in a worktree root with no `.git` at all — the husk a removed worktree leaves when
   * something (`.nx`, `.agents`, `.claude`) recreated files in it afterwards. Not a worktree, never
   * probed, and nothing here deletes it.
   */
  ORPHAN_DIRECTORY: 'orphan-directory',
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

/**
 * Why a registered `repository_checkouts` row of kind `worktree` has no live worktree behind it.
 * - `PATH_GONE` — nothing exists at the path any more.
 * - `NOT_A_WORKTREE` — something exists at the path, but it is not a linked worktree (a husk
 *   directory with no `.git`, or a real clone).
 */
export const MISSING_CHECKOUT_REASON = {
  NOT_A_WORKTREE: 'not-a-worktree',
  PATH_GONE: 'path-gone',
} as const;
