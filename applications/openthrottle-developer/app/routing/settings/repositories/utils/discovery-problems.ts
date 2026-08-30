import { WorktreeDiscoveryProblemKind } from '~/__generated__/graphql';
import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { DiscoveredWorktreesResult } from '~/routing/settings/repositories/data/types';

type WorktreeDiscoveryProblem = DiscoveredWorktreesResult['problems'][number];

/**
 * @description Identity of a rendered group. Several kinds collapse into
 * `degraded` because they say the same thing to a person — the scan could not
 * read something, so the list may be short — and differ only in the raw detail.
 */
export const WORKTREE_PROBLEM_GROUP = {
  DEGRADED: 'degraded',
  STALE: 'stale',
} as const;

export type WorktreeProblemGroupId =
  (typeof WORKTREE_PROBLEM_GROUP)[keyof typeof WORKTREE_PROBLEM_GROUP];

/** One rendered block: a sentence a person can act on, plus the raw lines behind it. */
export interface WorktreeProblemGroup {
  /** Raw server `detail` strings, shown only behind a disclosure. */
  readonly details: readonly string[];
  readonly id: WorktreeProblemGroupId;
  /** The optional next step, when there is one. */
  readonly remedy: string | null;
  readonly summary: string;
}

/** Everything the notice needs, decided here so the component stays presentational. */
export interface WorktreeDiscoverySummary {
  /** Roots that do not exist yet — a count, never a bullet per repository. */
  readonly emptyRootCount: number;
  readonly groups: readonly WorktreeProblemGroup[];
  /** How many problems the groups account for; drives the leading count line. */
  readonly problemCount: number;
}

/**
 * The kinds that mean "the scan could not read something". CAP_EXCEEDED has its own
 * droppedCount line, and NOT_A_GIT_REPO is reported on the repository's own row —
 * neither belongs in a page-level list.
 */
const DEGRADED_KINDS: readonly WorktreeDiscoveryProblemKind[] = [
  WorktreeDiscoveryProblemKind.CheckoutListFailed,
  WorktreeDiscoveryProblemKind.ProbeFailed,
  WorktreeDiscoveryProblemKind.RootUnreadable,
];

/** `n one` / `n other`, so the copy file holds whole clauses rather than fragments. */
const counted = (count: number, one: string, other: string): string =>
  `${count} ${count === 1 ? one : other}`;

/**
 * @description Turns a scan payload into what the notice renders: a group per
 * thing a person can do something about, and a count of the repositories that
 * simply have no worktrees yet.
 *
 * Returning zero groups is the expected result on a healthy machine — that is the
 * whole point of classifying, and the notice renders no alert at all in that case.
 */
export const summarizeDiscovery = (
  discoveredWorktrees: DiscoveredWorktreesResult,
): WorktreeDiscoverySummary => {
  const { problems, scannedRoots } = discoveredWorktrees;

  const stale = problems.filter(
    (problem) =>
      problem.kind === WorktreeDiscoveryProblemKind.StaleWorktreeEntry,
  );
  const degraded = problems.filter((problem) =>
    DEGRADED_KINDS.includes(problem.kind),
  );

  const groups: WorktreeProblemGroup[] = [];

  if (stale.length > 0) {
    groups.push({
      details: stale.map(describe),
      id: WORKTREE_PROBLEM_GROUP.STALE,
      remedy: WORKTREE_DISCOVERY_COPY.staleRemedy,
      summary: counted(
        stale.length,
        WORKTREE_DISCOVERY_COPY.staleSummarySuffixOne,
        WORKTREE_DISCOVERY_COPY.staleSummarySuffixOther,
      ),
    });
  }

  if (degraded.length > 0) {
    groups.push({
      details: degraded.map(describe),
      id: WORKTREE_PROBLEM_GROUP.DEGRADED,
      remedy: null,
      summary: WORKTREE_DISCOVERY_COPY.degradedSummary,
    });
  }

  return {
    emptyRootCount: scannedRoots.filter((root) => !root.exists).length,
    groups,
    problemCount: stale.length + degraded.length,
  };
};

/** One raw line: the path it is about, then the underlying message. */
const describe = (problem: WorktreeDiscoveryProblem): string =>
  problem.path === null
    ? problem.detail
    : `${problem.path} — ${problem.detail}`;
