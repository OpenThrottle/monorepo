// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.usage-branches';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.usage-branches');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const loaderArgs = (search = ''): Route.LoaderArgs =>
  createLoaderArgs<Route.LoaderArgs>({
    url: `http://localhost/resources/usage-branches${search}`,
  });

const RANGE = '?start=2026-07-01&end=2026-07-31';

describe('routes/resources.usage-branches loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the matches and echoes the normalized query', async () => {
    const items = [
      { branch: 'main', count: 12 },
      { branch: 'feat/usage', count: 3 },
    ];
    mockExecute.mockResolvedValue({
      skillUsageGitBranches: { hasMore: true, items },
    });

    const loaded = await loader(loaderArgs(`${RANGE}&query=%20Feat%20`));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      { end: '2026-07-31', limit: null, query: 'Feat', start: '2026-07-01' },
    );
    expect(loaded).toEqual({ hasMore: true, items, query: 'Feat' });
  });

  describe('when the query is blank', () => {
    test('asks for the unfiltered first page with a null query', async () => {
      mockExecute.mockResolvedValue({
        skillUsageGitBranches: { hasMore: false, items: [] },
      });

      const loaded = await loader(loaderArgs(`${RANGE}&query=%20%20`));

      expect(mockExecute).toHaveBeenCalledWith(
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({ query: null }),
      );
      expect(loaded).toEqual({ hasMore: false, items: [], query: '' });
    });
  });

  describe('when limit is supplied', () => {
    test('forwards a positive limit and ignores a junk one', async () => {
      mockExecute.mockResolvedValue({
        skillUsageGitBranches: { hasMore: false, items: [] },
      });

      await loader(loaderArgs(`${RANGE}&limit=5`));
      expect(mockExecute).toHaveBeenLastCalledWith(
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({ limit: 5 }),
      );

      await loader(loaderArgs(`${RANGE}&limit=nope`));
      expect(mockExecute).toHaveBeenLastCalledWith(
        expect.any(Request),
        expect.anything(),
        expect.objectContaining({ limit: null }),
      );
    });
  });

  describe('when the resolver throws', () => {
    test('degrades to an empty list instead of throwing into the popover', async () => {
      mockExecute.mockRejectedValue(new Error('resolver down'));

      const loaded = await loader(loaderArgs(`${RANGE}&query=main`));

      expect(loaded).toEqual({ hasMore: false, items: [], query: 'main' });
    });
  });
});
