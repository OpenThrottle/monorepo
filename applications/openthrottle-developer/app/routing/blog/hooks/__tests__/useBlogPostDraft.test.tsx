import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { MOCK_EDITOR_DRAFT } from '~/routing/blog/data/mock.blog-posts';
import type { BlogEditorPost } from '~/routing/blog/types';

import { useBlogPostDraft } from '../useBlogPostDraft';

describe('useBlogPostDraft', () => {
  test('starts clean, turns dirty on an edit, and clean again when reverted', () => {
    const { result } = renderHook(() => useBlogPostDraft(MOCK_EDITOR_DRAFT));

    expect(result.current.isDirty).toBe(false);

    act(() => result.current.setField('title', 'Changed'));
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.setField('title', MOCK_EDITOR_DRAFT.title));
    expect(result.current.isDirty).toBe(false);
  });

  test('reset discards local edits', () => {
    const { result } = renderHook(() => useBlogPostDraft(MOCK_EDITOR_DRAFT));

    act(() => result.current.setField('tagSlugs', []));
    act(() => result.current.reset());

    expect(result.current.values.tagSlugs).toEqual(['engineering']);
    expect(result.current.isDirty).toBe(false);
  });

  test('a newly loaded post (new updatedAt) replaces local state', () => {
    const { rerender, result } = renderHook(
      (post: BlogEditorPost) => useBlogPostDraft(post),
      { initialProps: MOCK_EDITOR_DRAFT },
    );

    act(() => result.current.setField('title', 'Saved title'));
    rerender({
      ...MOCK_EDITOR_DRAFT,
      title: 'Saved title',
      updatedAt: '2026-10-26T00:00:00.000Z',
    });

    expect(result.current.values.title).toBe('Saved title');
    expect(result.current.isDirty).toBe(false);
  });
});
