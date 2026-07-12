import { describe, expect, test } from 'vitest';

import {
  mergeSkillTags,
  parseSkillTagOverlayFile,
} from '../skill-tag-overlays.ts';

describe('parseSkillTagOverlayFile', () => {
  test('parses a valid overlay file', () => {
    const parsed = parseSkillTagOverlayFile(
      JSON.stringify({
        overlays: {
          'brag-sheet': { tags: ['docs', 'git', 'github'] },
          'create-cli': { tags: [] },
        },
        version: 1,
      }),
    );

    expect(parsed.overlays['brag-sheet']?.tags).toEqual([
      'docs',
      'git',
      'github',
    ]);
    expect(parsed.overlays['create-cli']?.tags).toEqual([]);
  });

  test('rejects an unknown top-level key (strict)', () => {
    expect(() =>
      parseSkillTagOverlayFile(
        JSON.stringify({ overlays: {}, unexpected: true, version: 1 }),
      ),
    ).toThrow();
  });

  test('rejects a stray key inside an overlay entry (strict)', () => {
    expect(() =>
      parseSkillTagOverlayFile(
        JSON.stringify({
          overlays: { 'brag-sheet': { tags: ['docs'], typo: 1 } },
          version: 1,
        }),
      ),
    ).toThrow();
  });

  test('rejects a non-kebab-case overlay key', () => {
    expect(() =>
      parseSkillTagOverlayFile(
        JSON.stringify({ overlays: { Brag_Sheet: { tags: [] } }, version: 1 }),
      ),
    ).toThrow();
  });

  test('rejects a non-kebab-case tag', () => {
    expect(() =>
      parseSkillTagOverlayFile(
        JSON.stringify({
          overlays: { 'brag-sheet': { tags: ['Docs'] } },
          version: 1,
        }),
      ),
    ).toThrow();
  });

  test('rejects an unsupported version', () => {
    expect(() =>
      parseSkillTagOverlayFile(JSON.stringify({ overlays: {}, version: 2 })),
    ).toThrow();
  });

  test('throws on malformed JSON', () => {
    expect(() => parseSkillTagOverlayFile('{ not json')).toThrow();
  });
});

describe('mergeSkillTags', () => {
  test('order-preserving union: frontmatter first, then overlay', () => {
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

  test('overlay-only (frontmatter empty) yields overlay order verbatim', () => {
    expect(mergeSkillTags([], ['backend', 'database', 'openthrottle'])).toEqual(
      ['backend', 'database', 'openthrottle'],
    );
  });
});
