import * as React from 'react';
import { useFetcher } from 'react-router';

import { BLOG_POST_SAVE_INTENT } from '~/routing/blog/config/defaults';
import type {
  BlogEditorPost,
  BlogPostEditorValues,
  BlogPostSaveIntent,
  BlogPostSaveRequest,
  BlogPostSaveResult,
} from '~/routing/blog/types';
import {
  diffBlogPostEditorValues,
  isBlogPostSaveResult,
} from '~/routing/blog/utils/editor';

export interface UseBlogPostSaveOptions {
  readonly post: BlogEditorPost;
  readonly values: BlogPostEditorValues;
}

export interface UseBlogPostSaveResult {
  readonly isSaving: boolean;
  /** Resends the same changes without `expectedUpdatedAt`. */
  readonly overwrite: () => void;
  /** The last save's outcome, or `null` before the first save. */
  readonly result: BlogPostSaveResult | null;
  /** Sends the changes with the loaded `updatedAt` as `expectedUpdatedAt`. */
  readonly save: () => void;
  /** The values the last save sent, to tell stale field errors apart. */
  readonly submitted: BlogPostEditorValues | null;
}

/**
 * @description Submits the editor's changes to the current route's action as
 * JSON through a fetcher, so saving never navigates (and never trips the
 * unsaved-changes guard). Only changed fields are sent; see
 * {@link diffBlogPostEditorValues}.
 */
export const useBlogPostSave = (
  options: UseBlogPostSaveOptions,
): UseBlogPostSaveResult => {
  const { post, values } = options;

  // Hooks
  const fetcher = useFetcher();
  const [submitted, setSubmitted] = React.useState<BlogPostEditorValues | null>(
    null,
  );

  // Setup
  const result = isBlogPostSaveResult(fetcher.data) ? fetcher.data : null;
  const isSaving = fetcher.state !== 'idle';

  // Handlers
  const submit = (intent: BlogPostSaveIntent): void => {
    const { changes, tagSlugs } = diffBlogPostEditorValues(post, values);
    const request: BlogPostSaveRequest = {
      changes,
      expectedUpdatedAt: String(post.updatedAt),
      intent,
      tagSlugs,
    };

    setSubmitted(values);
    void fetcher.submit(
      { ...request, changes: { ...changes } },
      { encType: 'application/json', method: 'post' },
    );
  };

  const save = (): void => submit(BLOG_POST_SAVE_INTENT.SAVE);
  const overwrite = (): void => submit(BLOG_POST_SAVE_INTENT.OVERWRITE);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return { isSaving, overwrite, result, save, submitted };
};
