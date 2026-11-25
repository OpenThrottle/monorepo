import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { loadSearchIndex } from '../loadSearchIndex.server';

vi.mock('@openthrottle/react-router-graphql', () => {
  return { executeGraphqlWithAuth: vi.fn() };
});

const load = (path: string) => {
  const url = new URL(`http://localhost${path}`);

  return loadSearchIndex(new Request(url), url);
};

describe('loadSearchIndex', () => {
  beforeEach(() => {
    vi.mocked(executeGraphqlWithAuth).mockReset();
  });

  describe('when the query is empty', () => {
    test('returns corpus stats', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        serverHealth: {
          embeddings: {
            coverage: [{ embedded: 2, entity: 'plan', total: 3 }],
            status: 'ok',
          },
        },
      });

      const result = await load('/search');

      expect(result.stats).toEqual({
        coverage: [{ embedded: 2, entity: 'plan', total: 3 }],
        kind: 'corpus',
      });
      expect(result.total).toBe(0);
    });

    test('degrades to empty coverage when the corpus query fails', async () => {
      vi.mocked(executeGraphqlWithAuth).mockRejectedValue(new Error('down'));

      const result = await load('/search');

      expect(result.stats).toEqual({ coverage: [], kind: 'corpus' });
    });
  });

  describe('when there is a query', () => {
    test('returns the page and knowledge stats', async () => {
      const sourceCounts = { documentation: 1, plan: 2, task: 0 };

      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        search: {
          chunks: [],
          mode: 'hybrid',
          reason: null,
          sourceCounts,
          total: 3,
        },
      });

      const result = await load('/search?q=auth');

      expect(result.stats).toEqual({
        kind: 'knowledge',
        mode: 'hybrid',
        reason: null,
        sourceCounts,
        total: 3,
      });
    });

    test('redirects a page past the last', async () => {
      vi.mocked(executeGraphqlWithAuth).mockResolvedValue({
        search: {
          chunks: [],
          mode: 'hybrid',
          reason: null,
          sourceCounts: { documentation: 0, plan: 1, task: 0 },
          total: 1,
        },
      });

      await expect(load('/search?q=auth&page=4')).rejects.toBeInstanceOf(
        Response,
      );
    });
  });
});
