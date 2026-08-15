import { describe, expect, test } from 'vitest';

import { mergeSkillTags } from '../skill-tag-overlays.ts';

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
