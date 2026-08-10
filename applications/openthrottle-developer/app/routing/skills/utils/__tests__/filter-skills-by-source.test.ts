import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  filterSkillsBySource,
  isSkillSourceFilter,
} from '~/routing/skills/utils/filter-skills-by-source';

const entry = (
  slug: string,
  source: RepoSkillEntry['source'],
): RepoSkillEntry => ({
  arguments: undefined,
  disableModelInvocation: undefined,
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

  test('narrows to external entries', () => {
    expect(
      filterSkillsBySource(entries, 'external').map((e) => e.slug),
    ).toEqual(['brag-sheet']);
  });
});

describe('isSkillSourceFilter', () => {
  test('accepts the three known filters', () => {
    expect(isSkillSourceFilter('all')).toBe(true);
    expect(isSkillSourceFilter('external')).toBe(true);
    expect(isSkillSourceFilter('openthrottle')).toBe(true);
  });

  test('rejects the radix empty-deselect value and unknown strings', () => {
    expect(isSkillSourceFilter('')).toBe(false);
    expect(isSkillSourceFilter('garbage')).toBe(false);
  });
});
