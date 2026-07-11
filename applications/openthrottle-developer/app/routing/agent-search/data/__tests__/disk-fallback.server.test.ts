// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(() => ''),
  readdirSync: vi.fn(() => []),
}));

vi.mock('@openthrottle/openthrottle-skills', () => ({
  parseSkillFrontmatter: vi.fn(() => ({ description: '', name: '' })),
}));

vi.mock('~/routing/agents/data/discover-repo-skills.server', () => ({
  discoverRepoSkills: vi.fn(() => []),
}));

vi.mock('~/routing/agents/data/discover-repo-personas.server', () => ({
  discoverRepoPersonas: vi.fn(() => []),
}));

const { discoverRepoSkills } =
  await import('~/routing/agents/data/discover-repo-skills.server');
const { discoverRepoPersonas } =
  await import('~/routing/agents/data/discover-repo-personas.server');
const { diskFallbackSearch } = await import('../disk-fallback.server');

const mockSkills = vi.mocked(discoverRepoSkills);
const mockPersonas = vi.mocked(discoverRepoPersonas);

describe('diskFallbackSearch', () => {
  beforeEach(() => {
    mockSkills.mockReset();
    mockPersonas.mockReset();
    mockSkills.mockReturnValue([]);
    mockPersonas.mockReturnValue([]);
  });

  test('returns empty when monorepo root is null', () => {
    expect(diskFallbackSearch('commit', ['skills'], 10, null)).toEqual([]);
  });

  test('returns empty when the query has no usable terms', () => {
    expect(diskFallbackSearch('   ', ['skills'], 10, '/repo')).toEqual([]);
  });

  test('keyword-ranks matching skills and tags them source:disk', () => {
    mockSkills.mockReturnValue([
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/git-commit/SKILL.md',
        slug: 'git-commit',
        summary: 'Helps you commit changes with conventional messages.',
        tags: undefined,
      },
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/nx-workspace/SKILL.md',
        slug: 'nx-workspace',
        summary: 'Explore the workspace.',
        tags: undefined,
      },
    ]);

    const results = diskFallbackSearch('commit', ['skills'], 10, '/repo');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      promptType: 'skills',
      similarity: null,
      source: 'disk',
      title: 'git-commit',
    });
  });

  test('only scans the requested prompt types', () => {
    mockSkills.mockReturnValue([
      {
        disableModelInvocation: undefined,
        layout: 'agents',
        repoRelativePath: '.agents/skills/git-commit/SKILL.md',
        slug: 'git-commit',
        summary: 'commit helper',
        tags: undefined,
      },
    ]);

    diskFallbackSearch('commit', ['personas'], 10, '/repo');

    expect(mockPersonas).toHaveBeenCalledTimes(1);
    expect(mockSkills).not.toHaveBeenCalled();
  });
});
