import { describe, expect, test } from 'vitest';

import { DEFAULT_SKILL_TAG_VOCABULARY } from '../default-skill-tag-vocabulary.ts';
import { findUnknownSkillTags, mergeSkillTags } from '../skill-tags.ts';

describe('findUnknownSkillTags', () => {
  test('passes when every tag is in the vocabulary', () => {
    const violations = findUnknownSkillTags(
      [
        { path: '.agents/skills/a/SKILL.md', tags: ['github', 'git'] },
        { path: '.agents/skills/b/SKILL.md', tags: ['ci'] },
      ],
      DEFAULT_SKILL_TAG_VOCABULARY,
    );

    expect(violations).toEqual([]);
  });

  test('passes when an entry has no tags at all', () => {
    const violations = findUnknownSkillTags(
      [{ path: '.agents/skills/a/SKILL.md', tags: undefined }],
      DEFAULT_SKILL_TAG_VOCABULARY,
    );

    expect(violations).toEqual([]);
  });

  test('passes when an entry has an empty tags array', () => {
    const violations = findUnknownSkillTags(
      [{ path: '.agents/skills/a/SKILL.md', tags: [] }],
      DEFAULT_SKILL_TAG_VOCABULARY,
    );

    expect(violations).toEqual([]);
  });

  test('fails and lists the offending file and tag for an unknown tag', () => {
    const violations = findUnknownSkillTags(
      [{ path: '.agents/skills/a/SKILL.md', tags: ['github', 'gh'] }],
      DEFAULT_SKILL_TAG_VOCABULARY,
    );

    expect(violations).toEqual([
      { path: '.agents/skills/a/SKILL.md', tag: 'gh' },
    ]);
  });

  test('lists one violation per unknown tag, across multiple files', () => {
    const violations = findUnknownSkillTags(
      [
        { path: '.agents/skills/a/SKILL.md', tags: ['gh', 'github'] },
        { path: '.agents/skills/b/SKILL.md', tags: ['not-a-real-tag'] },
      ],
      DEFAULT_SKILL_TAG_VOCABULARY,
    );

    expect(violations).toEqual([
      { path: '.agents/skills/a/SKILL.md', tag: 'gh' },
      { path: '.agents/skills/b/SKILL.md', tag: 'not-a-real-tag' },
    ]);
  });
});

describe('DEFAULT_SKILL_TAG_VOCABULARY', () => {
  test('is alphabetized', () => {
    const sorted = [...DEFAULT_SKILL_TAG_VOCABULARY].sort();

    expect([...DEFAULT_SKILL_TAG_VOCABULARY]).toEqual(sorted);
  });

  test('seeds exactly the agreed 16 tags', () => {
    expect([...DEFAULT_SKILL_TAG_VOCABULARY]).toEqual([
      'backend',
      'ci',
      'commit',
      'database',
      'docs',
      'frontend',
      'git',
      'github',
      'infra',
      'nx',
      'openthrottle',
      'planning',
      'pr-review',
      'terraform',
      'testing',
      'ui',
    ]);
  });
});

describe('mergeSkillTags', () => {
  test('order-preserving union: first list first, then extras', () => {
    expect(mergeSkillTags(['git'], ['github', 'docs'])).toEqual([
      'git',
      'github',
      'docs',
    ]);
  });

  test('dedupes overlaps, keeping first occurrence', () => {
    expect(mergeSkillTags(['git', 'github'], ['github', 'nx'])).toEqual([
      'git',
      'github',
      'nx',
    ]);
  });

  test('treats undefined sources as empty', () => {
    expect(mergeSkillTags(undefined, ['nx'])).toEqual(['nx']);
    expect(mergeSkillTags(['nx'], undefined)).toEqual(['nx']);
    expect(mergeSkillTags(undefined, undefined)).toEqual([]);
  });

  test('extras-only (frontmatter empty) yields extra order verbatim', () => {
    expect(mergeSkillTags([], ['backend', 'database', 'openthrottle'])).toEqual(
      ['backend', 'database', 'openthrottle'],
    );
  });
});
