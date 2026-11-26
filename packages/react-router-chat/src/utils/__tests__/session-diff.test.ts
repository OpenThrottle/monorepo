import { describe, expect, test } from 'vitest';

import type { ChatSessionDiffAvailable } from '../../types';
import {
  describeDiffFileTitle,
  formatDiffSummary,
  formatFileCount,
  formatPullRequestState,
} from '../session-diff';

const DIFF: ChatSessionDiffAvailable = {
  additions: 3,
  available: true,
  baseRef: 'origin/main',
  deletions: 1,
  files: [],
  filesTruncated: false,
  headBranch: undefined,
  pullRequest: undefined,
};

describe('formatFileCount', () => {
  test('is singular for one file and plural otherwise', () => {
    expect(formatFileCount(1)).toBe('1 file');
    expect(formatFileCount(3)).toBe('3 files');
  });
});

describe('formatPullRequestState', () => {
  test('labels a known state and passes an unknown one through', () => {
    const pullRequest = { number: 1, state: 'merged', url: 'u' };

    expect(formatPullRequestState(pullRequest)).toBe('merged');
    expect(formatPullRequestState({ ...pullRequest, state: 'draft' })).toBe(
      'draft',
    );
  });
});

describe('formatDiffSummary', () => {
  test('uses the singular for one file', () => {
    const files = [
      {
        additions: 3,
        binary: false,
        deletions: 1,
        path: 'a',
        previousPath: undefined,
        status: 'added',
      },
    ] as const;

    expect(formatDiffSummary({ ...DIFF, files })).toBe(
      '+3 −1 across 1 file vs origin/main',
    );
  });

  test('falls back to "base" without a base ref', () => {
    expect(formatDiffSummary({ ...DIFF, baseRef: undefined })).toContain(
      'vs base',
    );
  });
});

describe('describeDiffFileTitle', () => {
  test('is the path unless the file was renamed', () => {
    const file = {
      additions: 0,
      binary: false,
      deletions: 0,
      path: 'b.ts',
      previousPath: undefined,
      status: 'modified',
    } as const;

    expect(describeDiffFileTitle(file)).toBe('b.ts');
    expect(describeDiffFileTitle({ ...file, previousPath: 'a.ts' })).toBe(
      'Renamed from a.ts',
    );
  });
});
