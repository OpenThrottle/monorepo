import { describe, expect, test } from 'vitest';
import {
  githubPullChecksUrl,
  githubPullCommitsUrl,
  githubPullCompareUrl,
  githubRepoActionsForBranchUrl,
  githubRepoActionsForPullRequestHeadRefUrl,
  githubRepoActionsForPullRequestMergeRefUrl,
  githubRepoActionsPullRequestRunsUrl,
  githubRepoWorkflowsDirUrl,
} from '../github-pr-links';

describe('github-pr-links', () => {
  test('builds stable PR and repo URLs for CI debugging', () => {
    expect(githubPullChecksUrl('acme', 'web', 42)).toBe(
      'https://github.com/acme/web/pull/42/checks',
    );
    expect(githubPullCommitsUrl('acme', 'web', 42)).toBe(
      'https://github.com/acme/web/pull/42/commits',
    );
    expect(githubPullCompareUrl('acme', 'web', 'main', 'feat/ci-fix')).toBe(
      'https://github.com/acme/web/compare/main...feat%2Fci-fix',
    );
    expect(githubRepoActionsForBranchUrl('acme', 'web', 'feat/ci-fix')).toBe(
      'https://github.com/acme/web/actions?query=branch%3Afeat%2Fci-fix',
    );
    expect(githubRepoActionsPullRequestRunsUrl('acme', 'web')).toBe(
      'https://github.com/acme/web/actions?query=event%3Apull_request',
    );
    expect(githubRepoActionsForPullRequestHeadRefUrl('acme', 'web', 42)).toBe(
      'https://github.com/acme/web/actions?query=branch%3Arefs%2Fpull%2F42%2Fhead',
    );
    expect(githubRepoActionsForPullRequestMergeRefUrl('acme', 'web', 42)).toBe(
      'https://github.com/acme/web/actions?query=branch%3Arefs%2Fpull%2F42%2Fmerge',
    );
    expect(githubRepoWorkflowsDirUrl('acme', 'web')).toBe(
      'https://github.com/acme/web/tree/HEAD/.github/workflows',
    );
  });
});
