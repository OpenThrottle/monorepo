import { describe, expect, test } from 'vitest';

import type { CheckoutDiffSummaryFragment } from '~/__generated__/graphql';
import { CheckoutDiffFileStatus } from '~/__generated__/graphql';

import { toChatSessionDiff } from '../toChatSessionDiff';

const SUMMARY: CheckoutDiffSummaryFragment = {
  additions: 4,
  available: true,
  baseRef: 'origin/main',
  deletions: 1,
  files: [
    {
      additions: 4,
      binary: false,
      deletions: 1,
      path: 'src/new.ts',
      previousPath: 'src/old.ts',
      status: CheckoutDiffFileStatus.Renamed,
    },
    {
      additions: 0,
      binary: true,
      deletions: 0,
      path: 'a.png',
      previousPath: null,
      status: CheckoutDiffFileStatus.Added,
    },
  ],
  filesTruncated: false,
  headBranch: 'feat/x',
  pullRequest: { number: 7, state: 'open', url: 'https://example.test/7' },
  reason: null,
};

describe('toChatSessionDiff', () => {
  test('lowercases statuses and turns nulls into undefined', () => {
    const diff = toChatSessionDiff(SUMMARY);

    expect(diff.available).toBe(true);
    expect(diff).toMatchObject({
      files: [
        { path: 'src/new.ts', previousPath: 'src/old.ts', status: 'renamed' },
        { path: 'a.png', previousPath: undefined, status: 'added' },
      ],
      pullRequest: {
        number: 7,
        state: 'open',
        url: 'https://example.test/7',
      },
    });
  });

  test('a branch with no pull request maps to undefined', () => {
    expect(toChatSessionDiff({ ...SUMMARY, pullRequest: null })).toMatchObject({
      pullRequest: undefined,
    });
  });

  test('carries an unavailable reason through', () => {
    const diff = toChatSessionDiff({
      ...SUMMARY,
      available: false,
      reason: 'Not a git repository.',
    });

    expect(diff).toMatchObject({
      available: false,
      reason: 'Not a git repository.',
    });
  });
});
