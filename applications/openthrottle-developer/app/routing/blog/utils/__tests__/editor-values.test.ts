import { describe, expect, test } from 'vitest';

import { MOCK_EDITOR_DRAFT } from '~/routing/blog/data/mock.blog-posts';

import {
  diffBlogPostEditorValues,
  generateBlogDraftSlug,
  isBlogPostEditorDirty,
  isSameTagSet,
  toBlogPostEditorValues,
  validateBlogPostEditorValues,
} from '../editor-values';

const base = toBlogPostEditorValues(MOCK_EDITOR_DRAFT);

describe('routing/blog/utils/editor-values', () => {
  test('generateBlogDraftSlug satisfies the server slug rule', () => {
    const slug = generateBlogDraftSlug(1_700_000_000_000, () => 0.5);

    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(slug.startsWith('untitled-')).toBe(true);
    expect(generateBlogDraftSlug(1, () => 0)).toBe('untitled-1-0000');
  });

  test('toBlogPostEditorValues holds unset fields as empty strings', () => {
    expect(base).toMatchObject({
      authorSlug: 'ada',
      coverImageUrl: '',
      seoTitle: '',
      tagSlugs: ['engineering'],
    });
  });

  test('diff sends only changed fields, emptied nullable fields as null', () => {
    expect(
      diffBlogPostEditorValues(MOCK_EDITOR_DRAFT, {
        ...base,
        authorSlug: '',
        excerpt: '',
        title: 'New',
      }),
    ).toEqual({
      changes: { authorSlug: null, excerpt: null, title: 'New' },
      tagSlugs: null,
    });
  });

  test('diff sends the whole tag set only when it changed', () => {
    expect(
      diffBlogPostEditorValues(MOCK_EDITOR_DRAFT, {
        ...base,
        tagSlugs: ['engineering', 'releases'],
      }).tagSlugs,
    ).toEqual(['engineering', 'releases']);
    expect(isSameTagSet(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(isBlogPostEditorDirty(MOCK_EDITOR_DRAFT, base)).toBe(false);
  });

  test('validation mirrors the server rules', () => {
    expect(validateBlogPostEditorValues(base)).toEqual({});
    expect(
      validateBlogPostEditorValues({
        ...base,
        coverImageAlt: ' ',
        coverImageUrl: 'https://x.test/a.png',
        slug: 'Not Kebab',
        title: '  ',
      }),
    ).toEqual({
      coverImageAlt: 'Add alt text for the cover image.',
      slug: expect.stringContaining('lowercase'),
      title: 'A post needs a title.',
    });
  });
});
