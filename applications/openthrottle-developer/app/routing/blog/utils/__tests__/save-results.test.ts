import { describe, expect, test } from 'vitest';

import { MOCK_EDITOR_DRAFT } from '~/routing/blog/data/mock.blog-posts';
import { toBlogPostEditorValues } from '~/routing/blog/utils/editor-values';

import {
  didBlogPostSaveWrite,
  filterStaleFieldErrors,
  parseBlogPostSaveRequest,
  toBlogPostSaveFieldErrors,
} from '../save-results';

const values = toBlogPostEditorValues(MOCK_EDITOR_DRAFT);

describe('routing/blog/utils/save-results', () => {
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
      filterStaleFieldErrors(errors, values, { ...values, slug: 'other' }),
    ).toEqual({ title: 'bad' });
    expect(filterStaleFieldErrors(errors, null, values)).toEqual({});
  });
});
