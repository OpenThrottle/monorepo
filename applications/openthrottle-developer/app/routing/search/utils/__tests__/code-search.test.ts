import { describe, expect, test } from 'vitest';

import type { SearchCodeIndexStatusFragment } from '~/__generated__/graphql';
import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';

import type { CodeSearchNoticeState } from '../code-search';
import {
  getCodeIndexStatusLabel,
  getCodeSearchNotice,
  isCodeIndexSearchable,
  resolveCodeSearchRepository,
  toCodeMatchHref,
  toCodeSearchRepositories,
  toGithubRepo,
} from '../code-search';

const repository = (
  overrides: Partial<{
    displayName: string;
    gitDefaultBranch: string | null;
    gitRemoteUrl: string | null;
    id: string;
    kind: string;
  }> = {},
) => {
  return {
    displayName: 'monorepo',
    gitDefaultBranch: 'main',
    gitRemoteUrl: 'https://github.com/acme/monorepo.git',
    id: 'repo-1',
    kind: 'primary',
    ...overrides,
  };
};

const index = (status: string, indexedChunks = 5) => {
  return { failedReason: null, indexedChunks, repositoryId: 'repo-1', status };
};

describe('toGithubRepo', () => {
  test('reads https and ssh remotes', () => {
    expect(toGithubRepo('https://github.com/acme/monorepo.git')).toBe(
      'acme/monorepo',
    );
    expect(toGithubRepo('git@github.com:acme/monorepo.git')).toBe(
      'acme/monorepo',
    );
    expect(toGithubRepo('https://github.com/acme/monorepo')).toBe(
      'acme/monorepo',
    );
  });

  test('is null for another host or no remote', () => {
    expect(toGithubRepo('https://gitlab.com/acme/monorepo.git')).toBeNull();
    expect(toGithubRepo(null)).toBeNull();
  });
});

describe('toCodeMatchHref', () => {
  const match = {
    content: '',
    endLine: 9,
    path: 'src/a.ts',
    score: 1,
    startLine: 3,
  };

  test('links the lines at the default branch', () => {
    expect(toCodeMatchHref(repository(), match)).toBe(
      'https://github.com/acme/monorepo/blob/main/src/a.ts#L3-L9',
    );
  });

  test('is null without a GitHub remote', () => {
    expect(
      toCodeMatchHref(repository({ gitRemoteUrl: null }), match),
    ).toBeNull();
  });
});

describe('toCodeSearchRepositories', () => {
  test('offers primaries by name, dropping worktrees', () => {
    const offered = toCodeSearchRepositories([
      repository({ displayName: 'zeta', id: 'z' }),
      repository({ displayName: 'wt', id: 'w', kind: 'worktree' }),
      repository({ displayName: 'alpha', id: 'a' }),
    ]);

    expect(offered.map((item) => item.id)).toEqual(['a', 'z']);
  });

  test('falls back to every checkout when none is primary', () => {
    expect(
      toCodeSearchRepositories([repository({ kind: 'worktree' })]),
    ).toHaveLength(1);
  });
});

describe('resolveCodeSearchRepository', () => {
  const repositories = [repository({ id: 'a' }), repository({ id: 'b' })];

  test('picks the requested repository', () => {
    expect(resolveCodeSearchRepository(repositories, 'b')?.id).toBe('b');
  });

  test('falls back to the first for an unknown id or none', () => {
    expect(resolveCodeSearchRepository(repositories, 'zzz')?.id).toBe('a');
    expect(resolveCodeSearchRepository(repositories, null)?.id).toBe('a');
    expect(resolveCodeSearchRepository([], null)).toBeNull();
  });
});

describe('isCodeIndexSearchable', () => {
  test('needs chunks in a ready, indexing or failed index', () => {
    expect(isCodeIndexSearchable(index('ready'))).toBe(true);
    expect(isCodeIndexSearchable(index('failed'))).toBe(true);
    expect(isCodeIndexSearchable(index('ready', 0))).toBe(false);
    expect(isCodeIndexSearchable(index('notIndexed'))).toBe(false);
  });
});

describe('getCodeSearchNotice', () => {
  const state = (
    available: boolean,
    current: SearchCodeIndexStatusFragment | null,
  ): CodeSearchNoticeState => {
    return { available, canListRepositories: true, index: current };
  };

  test('names the state that needs explaining', () => {
    expect(getCodeSearchNotice(state(true, null))).toBe('noRepository');
    expect(getCodeSearchNotice(state(false, index('unavailable')))).toBe(
      'gated',
    );
    expect(getCodeSearchNotice(state(true, index('indexing')))).toBe(
      'indexing',
    );
    expect(getCodeSearchNotice(state(true, index('ready')))).toBeNull();
  });

  test('explains repositories the caller may not list before anything else', () => {
    expect(
      getCodeSearchNotice({
        available: true,
        canListRepositories: false,
        index: null,
      }),
    ).toBe('forbidden');
  });
});

describe('getCodeIndexStatusLabel', () => {
  test('labels a known status and passes an unknown one through', () => {
    expect(getCodeIndexStatusLabel('ready')).toBe(
      SEARCH_CODE_COPY.status.ready,
    );
    expect(getCodeIndexStatusLabel('mystery')).toBe('mystery');
  });
});
