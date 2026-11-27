import { describe, expect, test } from 'vitest';

import type {
  ChatSessionDiffAvailable,
  ChatSessionDiffFile,
} from '../../types';
import {
  describeDiffFile,
  describeDiffFileTitle,
  findAdjacentFilePath,
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

describe('describeDiffFile', () => {
  const FILE: ChatSessionDiffFile = {
    additions: 4,
    binary: false,
    deletions: 1,
    path: 'src/b.ts',
    previousPath: undefined,
    status: 'modified',
  };

  test('is the status and counts for a text file', () => {
    expect(describeDiffFile(FILE)).toBe('Modified · +4 −1');
  });

  test('omits the counts for a binary file', () => {
    expect(describeDiffFile({ ...FILE, binary: true })).toBe('Modified');
  });

  test('names where a renamed file came from', () => {
    expect(
      describeDiffFile({
        ...FILE,
        previousPath: 'src/a.ts',
        status: 'renamed',
      }),
    ).toBe('Renamed · +4 −1 · Renamed from src/a.ts');
  });
});

describe('findAdjacentFilePath', () => {
  const file = (path: string): ChatSessionDiffFile => {
    return {
      additions: 0,
      binary: false,
      deletions: 0,
      path,
      previousPath: undefined,
      status: 'modified',
    };
  };
  const FILES = [file('a'), file('b'), file('c')];

  test('steps forward and back', () => {
    expect(findAdjacentFilePath(FILES, 'a', 1)).toBe('b');
    expect(findAdjacentFilePath(FILES, 'c', -1)).toBe('b');
  });

  test('wraps past either end', () => {
    expect(findAdjacentFilePath(FILES, 'c', 1)).toBe('a');
    expect(findAdjacentFilePath(FILES, 'a', -1)).toBe('c');
  });

  test('is undefined for a path not in the list', () => {
    expect(findAdjacentFilePath(FILES, 'z', 1)).toBeUndefined();
  });
});
