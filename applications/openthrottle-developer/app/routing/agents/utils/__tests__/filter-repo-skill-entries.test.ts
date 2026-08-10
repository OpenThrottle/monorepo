import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { filterEntries } from '../filter-repo-skill-entries';

const buildEntry = (
  overrides: Partial<RepoSkillEntry> = {},
): RepoSkillEntry => ({
  arguments: undefined,
  disableModelInvocation: undefined,
  layout: 'agents',
  repoRelativePath: '.agents/skills/foo/SKILL.md',
  slug: 'foo',
  source: 'external',
  summary: 'Foo skill summary',
  tags: undefined,
  ...overrides,
});

describe('filterEntries', () => {
  const entries: RepoSkillEntry[] = [
    buildEntry({
      repoRelativePath: '.agents/skills/deploy/SKILL.md',
      slug: 'deploy',
      summary: 'Ship the app',
    }),
    buildEntry({
      repoRelativePath: '.agents/skills/notes/SKILL.md',
      slug: 'notes',
      summary: 'Take meeting notes',
    }),
    buildEntry({
      repoRelativePath: '.agents/skills/README/SKILL.md',
      slug: 'readme',
      summary: 'Write a DEPLOY guide',
    }),
  ];

  test('returns a copy of all entries when the query is empty', () => {
    const result = filterEntries(entries, '');
    expect(result).toEqual(entries);
    expect(result).not.toBe(entries);
  });

  test('returns a copy of all entries when the query is only whitespace', () => {
    const result = filterEntries(entries, '   ');
    expect(result).toEqual(entries);
  });

  test('matches case-insensitively by slug', () => {
    const result = filterEntries(entries, 'DEPLOY');
    expect(result.map((e) => e.slug)).toEqual(['deploy', 'readme']);
  });

  test('matches case-insensitively by repoRelativePath', () => {
    const result = filterEntries(entries, 'notes/SKILL');
    expect(result.map((e) => e.slug)).toEqual(['notes']);
  });

  test('matches case-insensitively by summary', () => {
    const result = filterEntries(entries, 'meeting');
    expect(result.map((e) => e.slug)).toEqual(['notes']);
  });

  test('returns an empty array when nothing matches', () => {
    expect(filterEntries(entries, 'nonexistent')).toEqual([]);
  });
});
