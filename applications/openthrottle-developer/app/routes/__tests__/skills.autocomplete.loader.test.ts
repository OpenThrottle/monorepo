// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { Route } from '@/app/routes/+types/skills.autocomplete';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

vi.mock('~/routing/agents/data/discover-repo-skills.server', () => ({
  discoverRepoSkills: vi.fn(),
}));

vi.mock('~/routing/agents/data/resolve-monorepo-root.server', () => ({
  getMonorepoRoot: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { discoverRepoSkills } =
  await import('~/routing/agents/data/discover-repo-skills.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { loader } = await import('../skills.autocomplete');

const mockExecute = vi.mocked(executeGraphqlWithAuth);
const mockDiscoverRepoSkills = vi.mocked(discoverRepoSkills);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);

const buildArgs = (search = ''): Route.LoaderArgs => {
  const request = new Request(`http://localhost/skills/autocomplete${search}`);
  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/skills/autocomplete',
    request,
    url: new URL(request.url),
  };
};

const repoSkill = (
  overrides: Partial<RepoSkillEntry> = {},
): RepoSkillEntry => ({
  arguments: undefined,
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/foo/SKILL.md',
  slug: 'foo',
  source: 'openthrottle',
  summary: 'Foo skill description',
  tags: [],
  ...overrides,
});

describe('routes/skills.autocomplete loader', () => {
  beforeEach(() => {
    mockExecute.mockReset();
    mockDiscoverRepoSkills.mockReset();
    mockGetMonorepoRoot.mockReset();
    mockGetMonorepoRoot.mockReturnValue('/workspace/openthrottle');
    mockExecute.mockRejectedValue(new Error('graphql unavailable'));
  });

  test('returns the full untruncated list for a blank query', async () => {
    mockDiscoverRepoSkills.mockReturnValue([
      repoSkill({ slug: 'foo' }),
      repoSkill({ slug: 'bar', summary: 'Bar skill description' }),
    ]);

    const result = await loader(buildArgs());

    expect(mockDiscoverRepoSkills).toHaveBeenCalledWith(
      '/workspace/openthrottle',
    );
    expect(result.query).toBe('');
    expect(result.truncated).toBe(false);
    expect(result.skills).toHaveLength(2);
    expect(result.skills.map((skill) => skill.slug)).toEqual(['foo', 'bar']);
  });

  test('filters matches by slug or description and echoes the query', async () => {
    mockDiscoverRepoSkills.mockReturnValue([
      repoSkill({ slug: 'foo', summary: 'Foo skill description' }),
      repoSkill({ slug: 'bar', summary: 'Bar skill description' }),
    ]);

    const result = await loader(buildArgs('?q=foo'));

    expect(result.query).toBe('foo');
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.slug).toBe('foo');
    expect(result.truncated).toBe(false);
  });

  test('returns an empty list when discovery finds no skills and GraphQL fails', async () => {
    mockDiscoverRepoSkills.mockReturnValue([]);

    const result = await loader(buildArgs());

    expect(result.skills).toEqual([]);
    expect(result.truncated).toBe(false);
  });
});
