import * as React from 'react';

import type {
  BlogEditorPost,
  BlogPostEditorValues,
  BlogPostFieldChangeHandler,
} from '~/routing/blog/types';
import {
  isBlogPostEditorDirty,
  toBlogPostEditorValues,
} from '~/routing/blog/utils/editor';

export interface UseBlogPostDraftResult {
  /** True when {@link values} differ from the loaded post. */
  readonly isDirty: boolean;
  /** Discards local edits: back to the loaded post. */
  readonly reset: () => void;
  readonly setField: BlogPostFieldChangeHandler;
  readonly values: BlogPostEditorValues;
}

/**
 * @description The editor's local edit state for one post. "Dirty" is computed
 * by comparing against the loaded post, never tracked by hand.
 *
 * When the loader hands over a post with a different `updatedAt` (after a save
 * or a reload revalidates), the local state resets to it during render, so the
 * form shows exactly what was saved and is clean again.
 */
export const useBlogPostDraft = (
  post: BlogEditorPost,
): UseBlogPostDraftResult => {
  // Hooks
  const [values, setValues] = React.useState<BlogPostEditorValues>(() =>
    toBlogPostEditorValues(post),
  );
  const [syncedPost, setSyncedPost] = React.useState({
    id: post.id,
    updatedAt: String(post.updatedAt),
  });

  // Setup
  const isDirty = isBlogPostEditorDirty(post, values);
  const loadedUpdatedAt = String(post.updatedAt);

  // Handlers
  const setField: BlogPostFieldChangeHandler = (field, value) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const reset = (): void => {
    setValues(toBlogPostEditorValues(post));
  };

  // Markup

  // Life Cycle
  // Adjust state while rendering (not in an effect) so the stale values never
  // paint: https://react.dev/learn/you-might-not-need-an-effect
  if (syncedPost.id !== post.id || syncedPost.updatedAt !== loadedUpdatedAt) {
    setSyncedPost({ id: post.id, updatedAt: loadedUpdatedAt });
    setValues(toBlogPostEditorValues(post));
  }

  // 🔌 Short Circuit

  return { isDirty, reset, setField, values };
};
