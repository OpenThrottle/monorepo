import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  mergeRepoSkillsWithProjectSkills,
  type ProjectSkillFlagRow,
} from '~/routing/skills/utils/merge-project-skills';

const diskEntry = (
  slug: string,
  overrides: Partial<RepoSkillEntry> = {},
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: `.agents/skills/${slug}/SKILL.md`,
  slug,
  source: 'external',
  summary: `${slug} summary`,
  tags: undefined,
  ...overrides,
});

describe('mergeRepoSkillsWithProjectSkills', () => {
  test('returns disk entries unchanged when projectSkills is empty (silent fallback)', () => {
    const entries = [diskEntry('alpha'), diskEntry('beta')];

    const merged = mergeRepoSkillsWithProjectSkills(entries, []);

    expect(merged).toBe(entries);
  });

  test('overlays flag and tags from a matching GraphQL row, keyed by slug', () => {
    const entries = [
      diskEntry('github-commit', {
        disableModelInvocation: undefined,
        tags: undefined,
      }),
    ];
    const rows: ProjectSkillFlagRow[] = [
      {
        slug: 'github-commit',
        staticDisableModelInvocation: true,
        tags: ['git', 'github'],
      },
    ];

    const [merged] = mergeRepoSkillsWithProjectSkills(entries, rows);

    expect(merged.disableModelInvocation).toBe(true);
    expect(merged.tags).toEqual(['git', 'github']);
    // Disk-owned fields are preserved.
    expect(merged.summary).toBe('github-commit summary');
    expect(merged.layout).toBe('agents');
  });

  test('maps a null GraphQL flag to undefined (tri-state preserved)', () => {
    const entries = [diskEntry('planner', { disableModelInvocation: true })];
    const rows: ProjectSkillFlagRow[] = [
      { slug: 'planner', staticDisableModelInvocation: null, tags: [] },
    ];

    const [merged] = mergeRepoSkillsWithProjectSkills(entries, rows);

    expect(merged.disableModelInvocation).toBeUndefined();
    expect(merged.tags).toEqual([]);
  });

  test('overlays source and sourceUrl from a recognized GraphQL row value', () => {
    const entries = [diskEntry('owned', { source: 'external' })];
    const rows: ProjectSkillFlagRow[] = [
      {
        slug: 'owned',
        source: 'openthrottle',
        sourceUrl: null,
        staticDisableModelInvocation: null,
        tags: [],
      },
    ];

    const [merged] = mergeRepoSkillsWithProjectSkills(entries, rows);

    expect(merged.source).toBe('openthrottle');
    expect(merged.sourceUrl).toBeUndefined();
  });

  test('overlays an ingested sourceUrl for an external skill', () => {
    const entries = [diskEntry('vendored')];
    const rows: ProjectSkillFlagRow[] = [
      {
        slug: 'vendored',
        source: 'external',
        sourceUrl: 'https://example.com/skills/vendored',
        staticDisableModelInvocation: null,
        tags: [],
      },
    ];

    const [merged] = mergeRepoSkillsWithProjectSkills(entries, rows);

    expect(merged.source).toBe('external');
    expect(merged.sourceUrl).toBe('https://example.com/skills/vendored');
  });

  test('keeps the disk source when the GraphQL row omits or garbles it', () => {
    const entries = [
      diskEntry('kept-owned', {
        source: 'openthrottle',
        sourceUrl: undefined,
      }),
    ];
    const rows: ProjectSkillFlagRow[] = [
      {
        slug: 'kept-owned',
        source: 'garbage-value',
        staticDisableModelInvocation: null,
        tags: [],
      },
    ];

    const [merged] = mergeRepoSkillsWithProjectSkills(entries, rows);

    expect(merged.source).toBe('openthrottle');
  });

  test('leaves disk entries without a matching GraphQL row untouched', () => {
    const untouched = diskEntry('only-on-disk', {
      disableModelInvocation: false,
      tags: ['local'],
    });
    const rows: ProjectSkillFlagRow[] = [
      { slug: 'other', staticDisableModelInvocation: true, tags: ['x'] },
    ];

    const [merged] = mergeRepoSkillsWithProjectSkills([untouched], rows);

    expect(merged).toBe(untouched);
  });

  test('disk remains the entry list — GraphQL-only slugs are not added', () => {
    const entries = [diskEntry('alpha')];
    const rows: ProjectSkillFlagRow[] = [
      { slug: 'alpha', staticDisableModelInvocation: true, tags: [] },
      { slug: 'ghost', staticDisableModelInvocation: true, tags: [] },
    ];

    const merged = mergeRepoSkillsWithProjectSkills(entries, rows);

    expect(merged).toHaveLength(1);
    expect(merged[0].slug).toBe('alpha');
  });
});
