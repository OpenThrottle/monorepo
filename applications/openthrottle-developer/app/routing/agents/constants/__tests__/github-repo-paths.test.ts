import { describe, expect, test } from 'vitest';
import { githubOpenThrottleMainBlob } from '~/routing/agents/constants/github-repo-paths';

describe('githubOpenThrottleMainBlob', () => {
  test('builds main-branch blob URL for a repo-relative path', () => {
    expect(githubOpenThrottleMainBlob('.agents/skills/foo/SKILL.md')).toBe(
      'https://github.com/OpenThrottle/monorepo/blob/main/.agents/skills/foo/SKILL.md',
    );
  });

  test('strips a leading slash from the path segment', () => {
    expect(githubOpenThrottleMainBlob('/packages/foo/README.md')).toBe(
      'https://github.com/OpenThrottle/monorepo/blob/main/packages/foo/README.md',
    );
  });
});
