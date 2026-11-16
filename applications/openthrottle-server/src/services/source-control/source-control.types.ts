import type { FORGE_KIND } from './source-control.constants.ts';

/** @description One of {@link FORGE_KIND}'s values. */
export type ForgeKind = (typeof FORGE_KIND)[keyof typeof FORGE_KIND];

/**
 * @description A repository on a forge. `fullName` is the forge's own path for it: `owner/name` on
 * GitHub, `group/subgroup/name` on GitLab. It is exactly what the ledger stores as `payload.repo`.
 */
export interface ForgeRepoRef {
  readonly forge: ForgeKind;
  readonly fullName: string;
}

/** @description Where `head` stands relative to `base`. */
export type ForgeCompareStatus = 'ahead' | 'behind' | 'diverged' | 'identical';

/** @description One changed file of a commit; `patch` only when the forge inlines it. */
export interface ForgeCommitFile {
  readonly additions: number;
  readonly deletions: number;
  readonly filename: string;
  readonly patch: string | null;
  readonly status: string;
}

/** @description A commit with its diff, for diff-driven classification and existence checks. */
export interface ForgeCommitDetail {
  readonly additions: number;
  readonly deletions: number;
  readonly files: ForgeCommitFile[];
  readonly message: string;
  readonly sha: string;
}

/** @description A commit as a branch listing returns it. */
export interface ForgeCommitSummary {
  /** The forge account that authored it; null when the forge cannot attribute it. */
  readonly authorLogin: string | null;
  /** Full commit message, trailers included. */
  readonly message: string;
  readonly sha: string;
}

/** @description The lifecycle facts the ledger needs about one pull (or merge) request. */
export interface ForgePullRequest {
  /** The commit the request landed as; null while open, or when the forge reports none. */
  readonly mergeCommitSha: string | null;
  readonly mergedAt: string | null;
  readonly number: number;
  /** A closed request with no `mergedAt` was abandoned, not merged. */
  readonly state: 'closed' | 'open';
}

/**
 * @description What the work ledger needs from a forge. Every method takes the repo's `fullName`;
 * a read the forge answers with "unknown" (404) resolves to null or [] rather than throwing, so one
 * inaccessible repo self-excludes from a sweep instead of failing it.
 */
export interface SourceControlForge {
  commitUrl(fullName: string, sha: string): string;
  compareCommits(
    fullName: string,
    base: string,
    head: string,
  ): Promise<ForgeCompareStatus | null>;
  /** The newest request whose head is `branch`, in any state; null when there is none. */
  findPullRequestForBranch(
    fullName: string,
    branch: string,
  ): Promise<ForgePullRequest | null>;
  getCommit(fullName: string, sha: string): Promise<ForgeCommitDetail | null>;
  getDefaultBranch(fullName: string): Promise<string | null>;
  /** The merge commit of the merged request containing `sha`; null when none merged it. */
  getMergeCommitShaForCommit(
    fullName: string,
    sha: string,
  ): Promise<string | null>;
  getPullRequest(fullName: string, number: number): Promise<ForgePullRequest>;
  readonly kind: ForgeKind;
  /** Commits on `branch`, newest first, stopping before `stopAtSha` (exclusive). */
  listCommits(
    fullName: string,
    branch: string,
    stopAtSha: string | null,
  ): Promise<ForgeCommitSummary[]>;
  pullRequestUrl(fullName: string, number: number): string;
}
