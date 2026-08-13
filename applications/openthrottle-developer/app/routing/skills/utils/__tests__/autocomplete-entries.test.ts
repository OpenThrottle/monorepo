import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@openthrottle/react-router-graphql', () => ({
  executeGraphqlWithAuth: vi.fn(),
}));

const { executeGraphqlWithAuth } =
  await import('@openthrottle/react-router-graphql');
const { ProjectSkillsDocument, SkillAvailabilityDocument } =
  await import('~/__generated__/graphql');
const {
  composeAutocompleteSkills,
  fromProjectSkills,
  loadProjectSkillFlags,
  loadSkillAvailability,
  toAutocompleteEntry,
} = await import('../autocomplete-entries');
type RepoSkillEntryType =
  import('~/routing/agents/data/repo-skills-registry').RepoSkillEntry;

const mockExecute = vi.mocked(executeGraphqlWithAuth);

const request = (): Request => new Request('http://localhost/');

const diskEntry = (
  overrides: Partial<RepoSkillEntryType> = {},
): RepoSkillEntryType => ({
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/example/SKILL.md',
  slug: 'example',
  source: 'openthrottle',
  summary: 'An example skill.',
  tags: ['foo'],
  ...overrides,
});

describe('loadProjectSkillFlags', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the skills array on success', async () => {
    mockExecute.mockResolvedValue({
      projectSkills: {
        skills: [
          {
            description: null,
            slug: 'example',
            source: 'openthrottle',
            sourceUrl: null,
            staticDisableModelInvocation: null,
            tags: [],
          },
        ],
        totalCount: 1,
      },
    });

    const result = await loadProjectSkillFlags(request());

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      ProjectSkillsDocument,
    );
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('example');
  });

  test('returns an empty array when the query throws', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    const result = await loadProjectSkillFlags(request());

    expect(result).toEqual([]);
  });
});

describe('loadSkillAvailability', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  test('returns the skills array on success, passing the interactive environment', async () => {
    mockExecute.mockResolvedValue({
      skillAvailability: {
        skills: [
          {
            effectiveDisableModelInvocation: true,
            provenance: 'frontmatter:true',
            slug: 'example',
            staticDisableModelInvocation: true,
          },
        ],
        totalCount: 1,
        warnings: [],
      },
    });

    const result = await loadSkillAvailability(request());

    expect(mockExecute).toHaveBeenCalledWith(
      expect.anything(),
      SkillAvailabilityDocument,
      { environment: 'interactive' },
    );
    expect(result).toHaveLength(1);
    expect(result[0].provenance).toBe('frontmatter:true');
  });

  test('returns an empty array when the query throws', async () => {
    mockExecute.mockRejectedValue(new Error('boom'));

    const result = await loadSkillAvailability(request());

    expect(result).toEqual([]);
  });
});

describe('toAutocompleteEntry', () => {
  test('maps summary to description and preserves slug/tags', () => {
    const entry = toAutocompleteEntry(
      diskEntry({
        slug: 'my-skill',
        summary: 'Does a thing',
        tags: ['a', 'b'],
      }),
    );

    expect(entry).toEqual({
      description: 'Does a thing',
      disabledForModel: false,
      slug: 'my-skill',
      tags: ['a', 'b'],
    });
  });

  test('prefers effectiveDisableModelInvocation over the static flag', () => {
    const entry = toAutocompleteEntry(
      diskEntry({
        disableModelInvocation: false,
        effectiveDisableModelInvocation: true,
      }),
    );

    expect(entry.disabledForModel).toBe(true);
  });

  test('falls back to the static flag when no effective flag is present', () => {
    const entry = toAutocompleteEntry(
      diskEntry({ disableModelInvocation: true }),
    );

    expect(entry.disabledForModel).toBe(true);
  });

  test('defaults disabledForModel to false and tags to empty when both are absent', () => {
    const entry = toAutocompleteEntry(diskEntry({ tags: undefined }));

    expect(entry.disabledForModel).toBe(false);
    expect(entry.tags).toEqual([]);
  });
});

describe('fromProjectSkills', () => {
  test('maps rows using the resolved availability flag when present', () => {
    const result = fromProjectSkills(
      [
        {
          description: 'A skill',
          slug: 'example',
          staticDisableModelInvocation: false,
          tags: ['x'],
        },
      ],
      [
        {
          effectiveDisableModelInvocation: true,
          provenance: 'posture:deny',
          slug: 'example',
        },
      ],
    );

    expect(result).toEqual([
      {
        description: 'A skill',
        disabledForModel: true,
        slug: 'example',
        tags: ['x'],
      },
    ]);
  });

  test('falls back to the static flag when availability has no matching row', () => {
    const result = fromProjectSkills(
      [
        {
          description: null,
          slug: 'example',
          staticDisableModelInvocation: true,
          tags: [],
        },
      ],
      [],
    );

    expect(result[0].disabledForModel).toBe(true);
    expect(result[0].description).toBe('');
  });

  test('defaults description to empty string and disabledForModel to false when unset', () => {
    const result = fromProjectSkills(
      [{ description: null, slug: 'example', tags: [] }],
      [],
    );

    expect(result[0]).toEqual({
      description: '',
      disabledForModel: false,
      slug: 'example',
      tags: [],
    });
  });
});

describe('composeAutocompleteSkills', () => {
  test('uses the project-skills fallback when disk discovery is empty', () => {
    const result = composeAutocompleteSkills(
      [],
      [{ description: 'From DB', slug: 'example', tags: [] }],
      [],
    );

    expect(result).toEqual([
      {
        description: 'From DB',
        disabledForModel: false,
        slug: 'example',
        tags: [],
      },
    ]);
  });

  test('merges disk entries with project skills and availability when disk discovery is non-empty', () => {
    const result = composeAutocompleteSkills(
      [diskEntry({ slug: 'example', summary: 'Disk summary', tags: ['disk'] })],
      [
        {
          description: 'ignored (disk summary wins)',
          slug: 'example',
          staticDisableModelInvocation: false,
          tags: ['from-db'],
        },
      ],
      [
        {
          effectiveDisableModelInvocation: true,
          provenance: 'tag-deny:from-db@rule-1',
          slug: 'example',
        },
      ],
    );

    expect(result).toEqual([
      {
        description: 'Disk summary',
        disabledForModel: true,
        slug: 'example',
        tags: ['from-db'],
      },
    ]);
  });
});
