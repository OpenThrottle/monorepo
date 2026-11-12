import { describe, expect, test } from 'vitest';

import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';

import { resolveSaveStatus } from '../resolveSaveStatus';

describe('resolveSaveStatus', () => {
  test('saving wins over every other state', () => {
    expect(
      resolveSaveStatus({ isDirty: true, isSaved: true, isSaving: true }),
    ).toBe(BLOG_EDITOR_COPY.saving);
  });

  test('unsaved beats saved', () => {
    expect(
      resolveSaveStatus({ isDirty: true, isSaved: true, isSaving: false }),
    ).toBe(BLOG_EDITOR_COPY.unsaved);
  });

  test('reports saved when clean and saved', () => {
    expect(
      resolveSaveStatus({ isDirty: false, isSaved: true, isSaving: false }),
    ).toBe(BLOG_EDITOR_COPY.saved);
  });

  test('reports nothing otherwise', () => {
    expect(
      resolveSaveStatus({ isDirty: false, isSaved: false, isSaving: false }),
    ).toBeNull();
  });
});
