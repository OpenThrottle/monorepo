// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import type { Route } from '@/app/routes/+types/resources.resolve-plan-ref';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { loader } = await import('../resources.resolve-plan-ref');

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const loaderArgs = (search = ''): Route.LoaderArgs =>
  createLoaderArgs<Route.LoaderArgs>({
    url: `http://localhost/resources/resolve-plan-ref${search}`,
  });

describe('routes/resources.resolve-plan-ref loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('short-circuits an empty prefix without calling GraphQL', async () => {
    const loaded = await loader(loaderArgs());

    expect(loaded).toEqual({ matches: [], prefix: '' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('short-circuits a too-short prefix without calling GraphQL', async () => {
    const loaded = await loader(loaderArgs('?prefix=f5e'));

    expect(loaded).toEqual({ matches: [], prefix: '' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('resolves a valid prefix and echoes the normalized value', async () => {
    const matches = [
      { id: 'f5e40886-36d3-4886-9781-9722e0b9217b', status: 'x', title: 'P' },
    ];
    mockExecute.mockResolvedValue({ resolvePlanRef: matches });

    const loaded = await loader(loaderArgs('?prefix=F5E40886-36D3'));

    expect(mockExecute).toHaveBeenCalledWith(
      expect.any(Request),
      expect.anything(),
      {
        prefix: 'f5e4088636d3',
      },
    );
    expect(loaded).toEqual({ matches, prefix: 'f5e4088636d3' });
  });

  test('degrades to an empty result when the resolver throws', async () => {
    mockExecute.mockRejectedValue(new Error('resolver down'));

    const loaded = await loader(loaderArgs('?prefix=f5e40886'));

    expect(loaded).toEqual({ matches: [], prefix: 'f5e40886' });
  });
});
