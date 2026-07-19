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

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { discoverRepoSkills } =
  await import('~/routing/agents/data/discover-repo-skills.server');
const { getMonorepoRoot } =
  await import('~/routing/agents/data/resolve-monorepo-root.server');
const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { ProjectSkillsDocument, SkillAvailabilityDocument } =
  await import('~/__generated__/graphql');
const { loader } = await import('../skills._index');

const mockDiscoverRepoSkills = vi.mocked(discoverRepoSkills);
const mockGetMonorepoRoot = vi.mocked(getMonorepoRoot);
const mockExecuteGraphqlWithAuth = vi.mocked(executeGraphqlWithAuth);

const SAMPLE_ENTRIES: readonly RepoSkillEntry[] = [
  {
    disableModelInvocation: undefined,
    layout: 'agents',
    repoRelativePath: '.agents/skills/nx-workspace/SKILL.md',
    slug: 'nx-workspace',
    source: 'external',
    summary: 'Explore Nx workspace structure.',
    tags: undefined,
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

const projectSkillsResult = (skills: unknown): unknown => ({
  projectSkills: {
    skills,
    totalCount: Array.isArray(skills) ? skills.length : 0,
  },
});

const skillAvailabilityResult = (
  skills: unknown,
  warnings: readonly string[] = [],
): unknown => ({
  skillAvailability: {
    skills,
    totalCount: Array.isArray(skills) ? skills.length : 0,
    warnings,
  },
});

function asMock<T>(value: unknown): T;
function asMock(value: unknown): unknown {
  return value;
}

/**
 * Route the mock by document: the loader fires ProjectSkills and
 * SkillAvailability in parallel. `availability` defaults to empty so tests that
 * only care about the static merge keep the static-only fallback.
 */
const mockGraphql = (
  projectSkills: unknown[],
  options: {
    readonly availability?: unknown[];
    readonly availabilityWarnings?: readonly string[];
  } = {},
): void => {
  mockExecuteGraphqlWithAuth.mockImplementation(
    asMock<typeof executeGraphqlWithAuth>(
      (_request: Request, document: unknown): Promise<unknown> => {
        if (document === SkillAvailabilityDocument) {
          return Promise.resolve(
            skillAvailabilityResult(
              options.availability ?? [],
              options.availabilityWarnings ?? [],
            ),
          );
        }
        if (document === ProjectSkillsDocument) {
          return Promise.resolve(projectSkillsResult(projectSkills));
        }
        return Promise.resolve({});
      },
    ),
  );
};

describe('routes/skills._index loader', () => {
  beforeEach(() => {
    mockDiscoverRepoSkills.mockReset();
    mockGetMonorepoRoot.mockReset();
    mockExecuteGraphqlWithAuth.mockReset();
    // Default: no rows from either query → silent fallback to disk values.
    mockGraphql([]);
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

  test('overlays projectSkills flag+tags onto disk entries, keyed by slug', async () => {
    mockGetMonorepoRoot.mockReturnValue('/workspace/openthrottle');
    mockDiscoverRepoSkills.mockReturnValue(SAMPLE_ENTRIES);
    mockGraphql([
      {
        slug: 'nx-workspace',
        staticDisableModelInvocation: true,
        tags: ['nx'],
      },
    ]);

    const result = await loader(loaderArgs);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      disableModelInvocation: true,
      slug: 'nx-workspace',
      tags: ['nx'],
    });
  });

  test('overlays skillAvailability effective flag + provenance onto disk entries', async () => {
    mockGetMonorepoRoot.mockReturnValue('/workspace/openthrottle');
    mockDiscoverRepoSkills.mockReturnValue(SAMPLE_ENTRIES);
    mockGraphql(
      [
        {
          slug: 'nx-workspace',
          staticDisableModelInvocation: true,
          tags: ['nx'],
        },
      ],
      {
        availability: [
          {
            effectiveDisableModelInvocation: false,
            provenance: 'tag-allow:nx@rule-1',
            slug: 'nx-workspace',
          },
        ],
      },
    );

    const result = await loader(loaderArgs);

    expect(result.entries[0]).toMatchObject({
      disableModelInvocation: true,
      effectiveDisableModelInvocation: false,
      provenance: 'tag-allow:nx@rule-1',
      slug: 'nx-workspace',
    });
  });

  test('falls back silently to disk values when the GraphQL query throws', async () => {
    mockGetMonorepoRoot.mockReturnValue('/workspace/openthrottle');
    mockDiscoverRepoSkills.mockReturnValue(SAMPLE_ENTRIES);
    mockExecuteGraphqlWithAuth.mockRejectedValue(new Error('DB not ingested'));

    const result = await loader(loaderArgs);

    expect(result.entries).toEqual(SAMPLE_ENTRIES);
  });

  test('keeps the static merge when only skillAvailability fails (independent fallbacks)', async () => {
    mockGetMonorepoRoot.mockReturnValue('/workspace/openthrottle');
    mockDiscoverRepoSkills.mockReturnValue(SAMPLE_ENTRIES);
    mockExecuteGraphqlWithAuth.mockImplementation(
      asMock<typeof executeGraphqlWithAuth>(
        (_request: Request, document: unknown): Promise<unknown> => {
          if (document === SkillAvailabilityDocument) {
            return Promise.reject(new Error('resolver down'));
          }
          return Promise.resolve(
            projectSkillsResult([
              {
                slug: 'nx-workspace',
                staticDisableModelInvocation: true,
                tags: ['nx'],
              },
            ]),
          );
        },
      ),
    );

    const result = await loader(loaderArgs);

    expect(result.entries[0]).toMatchObject({
      disableModelInvocation: true,
      slug: 'nx-workspace',
      tags: ['nx'],
    });
    expect(result.entries[0].effectiveDisableModelInvocation).toBeUndefined();
    expect(result.entries[0].provenance).toBeUndefined();
  });
});
