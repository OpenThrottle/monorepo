import { describe, expect, test } from 'vitest';
import {
  githubPullChecksUrl,
  githubPullCommitsUrl,
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
    expect(githubRepoActionsPullRequestRunsUrl('acme', 'web')).toBe(
      'https://github.com/acme/web/actions?query=event%3Apull_request',
    );
    expect(githubRepoWorkflowsDirUrl('acme', 'web')).toBe(
      'https://github.com/acme/web/tree/HEAD/.github/workflows',
    );
  });
});
