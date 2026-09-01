import { describe, expect, test } from 'vitest';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  filterSkillsBySource,
  getSkillSourceKind,
  isSkillSourceFilter,
  parseSkillSourceFilter,
} from '~/routing/skills/utils/filter-skills-by-source';

const entry = (
  slug: string,
  source: RepoSkillEntry['source'],
  overlay?: 'custom' | 'personal',
): RepoSkillEntry => ({
  disableModelInvocation: undefined,
  isCustom: overlay === 'custom' ? true : undefined,
  isPersonal: overlay === 'personal' ? true : undefined,
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
  entry('my-draft', 'external', 'personal'),
  entry('team-skill', 'external', 'custom'),
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

  // A custom skill also carries source: 'external' — it is authored in this
  // repo, not installed into it — so External must not sweep it up either.
  test('narrows to custom entries', () => {
    expect(filterSkillsBySource(entries, 'custom').map((e) => e.slug)).toEqual([
      'team-skill',
    ]);
  });
});

describe('getSkillSourceKind', () => {
  test('maps source: openthrottle to openthrottle', () => {
    expect(getSkillSourceKind(entry('ot-plans', 'openthrottle'))).toBe(
      'openthrottle',
    );
  });

  test('maps source: external to external', () => {
    expect(getSkillSourceKind(entry('brag-sheet', 'external'))).toBe(
      'external',
    );
  });

  test('personal outranks source: external', () => {
    expect(getSkillSourceKind(entry('my-draft', 'external', 'personal'))).toBe(
      'personal',
    );
  });

  test('custom outranks source: external', () => {
    expect(getSkillSourceKind(entry('team-skill', 'external', 'custom'))).toBe(
      'custom',
    );
  });

  // Personal is checked first, so a nonsensical both-flags entry resolves to
  // personal rather than depending on object key order.
  test('personal wins over custom when both flags are set', () => {
    expect(
      getSkillSourceKind({
        isCustom: true,
        isPersonal: true,
        source: 'external',
      }),
    ).toBe('personal');
  });
});

describe('isSkillSourceFilter', () => {
  test('accepts the five known filters', () => {
    expect(isSkillSourceFilter('all')).toBe(true);
    expect(isSkillSourceFilter('custom')).toBe(true);
    expect(isSkillSourceFilter('external')).toBe(true);
    expect(isSkillSourceFilter('openthrottle')).toBe(true);
    expect(isSkillSourceFilter('personal')).toBe(true);
  });

  test('rejects the radix empty-deselect value and unknown strings', () => {
    expect(isSkillSourceFilter('')).toBe(false);
    expect(isSkillSourceFilter('garbage')).toBe(false);
  });
});

describe('parseSkillSourceFilter', () => {
  test('passes through every known filter token', () => {
    expect(parseSkillSourceFilter('all')).toBe('all');
    expect(parseSkillSourceFilter('custom')).toBe('custom');
    expect(parseSkillSourceFilter('external')).toBe('external');
    expect(parseSkillSourceFilter('openthrottle')).toBe('openthrottle');
    expect(parseSkillSourceFilter('personal')).toBe('personal');
  });

  // A hand-edited or stale `?source=` must render the full list, never 404.
  test('falls back to all for missing, empty, and unknown values', () => {
    expect(parseSkillSourceFilter(null)).toBe('all');
    expect(parseSkillSourceFilter(undefined)).toBe('all');
    expect(parseSkillSourceFilter('')).toBe('all');
    expect(parseSkillSourceFilter('garbage')).toBe('all');
  });
});
