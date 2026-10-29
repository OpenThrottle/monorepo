import { describe, expect, test } from 'vitest';

import { MOCK_EDITOR_DRAFT } from '~/routing/blog/data/mock.blog-posts';

import {
  didBlogPostSaveWrite,
  diffBlogPostEditorValues,
  filterStaleFieldErrors,
  isBlogPostEditorDirty,
  isSameTagSet,
  parseBlogPostSaveRequest,
  toBlogPostEditorValues,
  toBlogPostSaveFieldErrors,
  validateBlogPostEditorValues,
} from '../editor';

const base = toBlogPostEditorValues(MOCK_EDITOR_DRAFT);

describe('routing/blog/utils/editor', () => {
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

  test('parses a well-formed save body and rejects anything else', () => {
    const body = {
      changes: { title: 'x' },
      expectedUpdatedAt: '2026-10-20T15:30:00.000Z',
      intent: 'save',
      tagSlugs: null,
    };

    expect(parseBlogPostSaveRequest(body)).toEqual(body);
    expect(parseBlogPostSaveRequest({ ...body, intent: 'publish' })).toBeNull();
    expect(
      parseBlogPostSaveRequest({ ...body, changes: { status: 'PUBLISHED' } }),
    ).toBeNull();
    expect(parseBlogPostSaveRequest(null)).toBeNull();
  });

  test('only a save that wrote the post asks for a refetch', () => {
    expect(didBlogPostSaveWrite({ outcome: 'saved' })).toBe(true);
    expect(
      didBlogPostSaveWrite({ message: 'm', outcome: 'tagsNotSaved' }),
    ).toBe(true);
    expect(didBlogPostSaveWrite({ message: 'm', outcome: 'staleWrite' })).toBe(
      false,
    );
    expect(didBlogPostSaveWrite(undefined)).toBe(false);
  });

  test('maps union errors onto field errors', () => {
    expect(
      toBlogPostSaveFieldErrors({
        message: 'm',
        outcome: 'slugConflict',
        slug: 'taken',
      }),
    ).toEqual({ slug: 'The slug "taken" is already taken.' });
    expect(
      toBlogPostSaveFieldErrors({ message: 'm', outcome: 'coverAltRequired' }),
    ).toEqual({ coverImageAlt: 'Add alt text for the cover image.' });
    expect(
      toBlogPostSaveFieldErrors({
        entity: 'AUTHOR',
        key: 'x',
        message: 'Unknown author',
        outcome: 'referenceNotFound',
      }),
    ).toEqual({ authorSlug: 'Unknown author' });
    expect(toBlogPostSaveFieldErrors({ outcome: 'saved' })).toEqual({});
  });

  test('drops a server field error once that field is edited', () => {
    const errors = { slug: 'taken', title: 'bad' };

    expect(
      filterStaleFieldErrors(errors, base, { ...base, slug: 'other' }),
    ).toEqual({ title: 'bad' });
    expect(filterStaleFieldErrors(errors, null, base)).toEqual({});
  });
});
