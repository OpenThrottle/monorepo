// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { Route } from '@/app/routes/+types/skills._index';
import { createTestRouterContext } from '@openthrottle/react-router-testing';

vi.mock('~/routing/agents/data/discover-repo-skills.server', () => ({
  discoverRepoSkills: vi.fn(),
}));

vi.mock('~/routing/agents/data/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

const { discoverRepoSkills } =
  await import('~/routing/agents/data/discover-repo-skills.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { loader } = await import('../skills._index');

const mockDiscoverRepoSkills = vi.mocked(discoverRepoSkills);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);

const SAMPLE_ENTRIES: readonly RepoSkillEntry[] = [
  {
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    summary: 'Explore Nx workspace structure.',
  },
];

const loaderRequest = new Request('http://localhost/skills');
const loaderArgs: Route.LoaderArgs = {
  context: createTestRouterContext(),
  params: {},
  pattern: '/skills',
  request: loaderRequest,
  url: new URL(loaderRequest.url),
};

describe('routes/skills._index loader', () => {
  beforeEach(() => {
    mockDiscoverRepoSkills.mockReset();
    mockGetMonorepoRoot.mockReset();
  });

  test('calls discovery with the resolved monorepo root', async () => {
    const monorepoRoot = '/workspace/openthrottle';
    mockGetMonorepoRoot.mockReturnValue(monorepoRoot);
    mockDiscoverRepoSkills.mockReturnValue(SAMPLE_ENTRIES);

    const result = await loader(loaderArgs);

    expect(mockGetMonorepoRoot).toHaveBeenCalledTimes(1);
    expect(mockDiscoverRepoSkills).toHaveBeenCalledWith(monorepoRoot);
    expect(result.entries).toEqual(SAMPLE_ENTRIES);
  });

  test('returns an empty list when monorepo root cannot be resolved', async () => {
    mockGetMonorepoRoot.mockReturnValue(null);
    mockDiscoverRepoSkills.mockReturnValue([]);

    const result = await loader(loaderArgs);

    expect(mockDiscoverRepoSkills).toHaveBeenCalledWith(null);
    expect(result.entries).toEqual([]);
  });
});
