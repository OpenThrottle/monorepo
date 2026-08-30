import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  filterSkillsBySource,
  isSkillSourceFilter,
} from '~/routing/skills/utils/filter-skills-by-source';

const entry = (
  slug: string,
  source: RepoSkillEntry['source'],
  isPersonal?: true,
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  isPersonal,
  layout: 'agents',
  repoRelativePath: `.agents/skills/${slug}/SKILL.md`,
  slug,
  source,
  summary: `${slug} summary`,
  tags: undefined,
});

const entries = [
  entry('ot-plans', 'openthrottle'),
  entry('brag-sheet', 'external'),
  entry('workflow-ralph', 'openthrottle'),
  entry('my-draft', 'external', true),
];

describe('filterSkillsBySource', () => {
  test('returns the same list for the all filter', () => {
    expect(filterSkillsBySource(entries, 'all')).toBe(entries);
  });

  test('narrows to openthrottle entries', () => {
    expect(
      filterSkillsBySource(entries, 'openthrottle').map((e) => e.slug),
    ).toEqual(['ot-plans', 'workflow-ralph']);
  });

  // A personal skill carries source: 'external' because it is not authored in
  // skills/ — but it is yours, not a third party's, so External must not sweep
  // it up. Each skill belongs to exactly one segment.
  test('narrows to external entries without sweeping in personal ones', () => {
    expect(
      filterSkillsBySource(entries, 'external').map((e) => e.slug),
    ).toEqual(['brag-sheet']);
  });

  test('narrows to personal entries', () => {
    expect(
      filterSkillsBySource(entries, 'personal').map((e) => e.slug),
    ).toEqual(['my-draft']);
  });
});

describe('isSkillSourceFilter', () => {
  test('accepts the four known filters', () => {
    expect(isSkillSourceFilter('all')).toBe(true);
    expect(isSkillSourceFilter('external')).toBe(true);
    expect(isSkillSourceFilter('openthrottle')).toBe(true);
    expect(isSkillSourceFilter('personal')).toBe(true);
  });

  test('rejects the radix empty-deselect value and unknown strings', () => {
    expect(isSkillSourceFilter('')).toBe(false);
    expect(isSkillSourceFilter('garbage')).toBe(false);
  });
});
