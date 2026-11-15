// @vitest-environment node
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Route } from '@/app/routes/+types/search._index';
import { searchChunkFixture } from '~/testing/search-route-fixtures';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../search._index');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

function buildArgs(search: string): Route.LoaderArgs {
  const request = new Request(`http://localhost/search${search}`);

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/search',
    request,
    url: new URL(request.url),
  };
}

function searchResult(total: number): unknown {
  return {
    search: { chunks: [searchChunkFixture], total },
  };
}

describe('routes/search._index loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('skips the API for an empty query', async () => {
    const data = await loader(buildArgs('?q=%20'));

    expect(mockExecute).not.toHaveBeenCalled();
    expect(data.total).toBe(0);
  });

  test('asks the server for one page by offset and uses its total', async () => {
    mockExecute.mockResolvedValue(searchResult(45));

    const data = await loader(buildArgs('?q=cms&page=3&limit=20'));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      { input: { limit: 20, offset: 40, query: 'cms' } },
    );
    expect(data.total).toBe(45);
    expect(data.results.chunks).toHaveLength(1);
  });

  test('redirects a page past the end to the last page, keeping q, limit and details', async () => {
    mockExecute.mockResolvedValue(searchResult(25));

    const response: unknown = await loader(
      buildArgs('?q=cms&page=9&limit=20&details=ranking'),
    ).catch((error: unknown) => {
      return error;
    });

    expect(response).toBeInstanceOf(Response);

    if (!(response instanceof Response)) {
      return;
    }

    const location = response.headers.get('Location') ?? '';

    expect(location).toContain('page=2');
    expect(location).toContain('q=cms');
    expect(location).toContain('limit=20');
    expect(location).toContain('details=ranking');
  });
});
