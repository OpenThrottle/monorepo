import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  GetSearchCodeIndexStatusDocument,
  GetSearchCodeRepositoriesDocument,
  GetSearchCodeResultsDocument,
} from '~/__generated__/graphql';
import { parseSearchParams } from '~/routing/search/utils/parsers';

import { loadSearchCode } from '../loadSearchCode.server';

vi.mock('@openthrottle/react-router-graphql', () => {
  return { executeGraphqlWithAuth: vi.fn() };
});

const PRIMARY = {
  displayName: 'monorepo',
  gitDefaultBranch: 'main',
  gitRemoteUrl: 'git@github.com:acme/monorepo.git',
  id: 'repo-1',
  kind: 'primary',
};

const MATCH = {
  content: 'export const x = 1;',
  endLine: 4,
  path: 'src/x.ts',
  score: 0.8,
  startLine: 2,
};

interface MockAnswers {
  readonly matches?: readonly (typeof MATCH)[];
  readonly repositories: readonly (typeof PRIMARY)[];
  readonly status?: string;
  readonly total?: number;
}

/** @description Answers each code-scope document with the given data. */
function answer(answers: MockAnswers): void {
  vi.mocked(executeGraphqlWithAuth).mockImplementation(
    async (_request, document) => {
      if (document === GetSearchCodeRepositoriesDocument) {
        return { workspaceLocalRepositories: answers.repositories };
      }

      if (document === GetSearchCodeIndexStatusDocument) {
        return {
          codeIndexStatus: {
            failedReason: null,
            indexedChunks: 12,
            repositoryId: 'repo-1',
            status: answers.status ?? 'ready',
          },
        };
      }

      if (document === GetSearchCodeResultsDocument) {
        return {
          codeSemanticSearch: {
            available: true,
            matches: answers.matches ?? [MATCH],
            total: answers.total ?? 1,
          },
        };
      }

      throw new Error('unexpected document');
    },
  );
}

const load = (search: string) => {
  const params = parseSearchParams(new URLSearchParams(search));

  return loadSearchCode(new Request('http://localhost/search'), params);
};

describe('loadSearchCode', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
  });

  describe('when no repository is registered', () => {
    test('returns the no-repository state without searching', async () => {
      answer({ repositories: [] });

      const result = await load('scope=code&q=auth');

      expect(result.code.repository).toBeNull();
      expect(result.stats).toEqual({ index: null, kind: 'code', total: null });
      expect(executeGraphqlWithAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe('with a ready index and a query', () => {
    test('searches the default repository by page offset', async () => {
      answer({ repositories: [PRIMARY], total: 23 });

      const result = await load('scope=code&q=auth&page=2&limit=10');

      expect(executeGraphqlWithAuth).toHaveBeenCalledWith(
        expect.any(Request),
        GetSearchCodeResultsDocument,
        {
          input: {
            limit: 10,
            offset: 10,
            query: 'auth',
            repositoryId: 'repo-1',
          },
        },
      );
      expect(result.total).toBe(23);
      expect(result.code.matches).toHaveLength(1);
      expect(result.stats.total).toBe(23);
    });

    test('redirects a page past the last, keeping the scope', async () => {
      answer({ repositories: [PRIMARY], total: 3 });

      const response: unknown = await load('scope=code&q=auth&page=5').catch(
        (error: unknown) => {
          return error;
        },
      );

      expect(response).toBeInstanceOf(Response);

      if (response instanceof Response) {
        expect(response.headers.get('Location')).toContain('scope=code');
      }
    });
  });

  describe('without a query', () => {
    test('reads the index status but does not search', async () => {
      answer({ repositories: [PRIMARY] });

      const result = await load('scope=code');

      expect(result.code.index?.status).toBe('ready');
      expect(result.stats.total).toBeNull();
      expect(executeGraphqlWithAuth).not.toHaveBeenCalledWith(
        expect.anything(),
        GetSearchCodeResultsDocument,
        expect.anything(),
      );
    });
  });

  describe('when code search is gated off', () => {
    test('marks the scope unavailable and does not search', async () => {
      answer({ repositories: [PRIMARY], status: 'unavailable' });

      const result = await load('scope=code&q=auth');

      expect(result.code.available).toBe(false);
      expect(result.stats.total).toBe(0);
    });
  });
});
