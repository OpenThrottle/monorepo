// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoPersonaEntry } from '~/routing/agents/data/repo-personas-registry';
import type { Route } from '@/app/routes/+types/personas._index';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('~/routing/agents/data/discover-repo-personas.server', () => ({
  discoverRepoPersonas: vi.fn(),
}));

vi.mock('~/routing/agents/data/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

const { discoverRepoPersonas } =
  await import('~/routing/agents/data/discover-repo-personas.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { loader } = await import('../personas._index');

const mockDiscoverRepoPersonas = vi.mocked(discoverRepoPersonas);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);

const SAMPLE_ENTRIES: readonly RepoPersonaEntry[] = [
  {
    repoRelativePath: '.agents/personas/architect.md',
    slug: 'architect',
    summary: 'Architecture lens.',
  },
];

const loaderRequest = new Request('http://localhost/personas');
const loaderArgs: Route.LoaderArgs = {
  context: createTestRouterContext(),
  params: {},
  pattern: '/personas',
  request: loaderRequest,
  url: new URL(loaderRequest.url),
};

describe('routes/personas._index loader', () => {
  beforeEach(() => {
    mockDiscoverRepoPersonas.mockReset();
    mockGetMonorepoRoot.mockReset();
  });

  test('calls discovery with the resolved monorepo root', async () => {
    const monorepoRoot = '/workspace/openthrottle';
    mockGetMonorepoRoot.mockReturnValue(monorepoRoot);
    mockDiscoverRepoPersonas.mockReturnValue(SAMPLE_ENTRIES);

    const result = await loader(loaderArgs);

    expect(mockGetMonorepoRoot).toHaveBeenCalledTimes(1);
    expect(mockDiscoverRepoPersonas).toHaveBeenCalledWith(monorepoRoot);
    expect(result.entries).toEqual(SAMPLE_ENTRIES);
  });

  test('returns an empty list when monorepo root cannot be resolved', async () => {
    mockGetMonorepoRoot.mockReturnValue(null);
    mockDiscoverRepoPersonas.mockReturnValue([]);

    const result = await loader(loaderArgs);

    expect(mockDiscoverRepoPersonas).toHaveBeenCalledWith(null);
    expect(result.entries).toEqual([]);
  });
});
