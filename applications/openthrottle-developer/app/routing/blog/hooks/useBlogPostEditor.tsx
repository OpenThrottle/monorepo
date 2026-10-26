import * as React from 'react';
import type { Blocker } from 'react-router';
import { useRevalidator } from 'react-router';

import { BlogPostState } from '~/__generated__/graphql';
import { useBlogPostDraft } from '~/routing/blog/hooks/useBlogPostDraft';
import { useBlogPostSave } from '~/routing/blog/hooks/useBlogPostSave';
import { useUnsavedChangesGuard } from '~/routing/blog/hooks/useUnsavedChangesGuard';
import type {
  BlogEditorPost,
  BlogPostEditorValues,
  BlogPostFieldChangeHandler,
  BlogPostFieldErrors,
  BlogPostSaveResult,
} from '~/routing/blog/types';
import { validateBlogPostEditorValues } from '~/routing/blog/utils/editor-values';
import {
  filterStaleFieldErrors,
  toBlogPostSaveFieldErrors,
} from '~/routing/blog/utils/save-results';

export interface UseBlogPostEditorOptions {
  /** The caller holds `blog:write` (may edit posts that are not drafts). */
  readonly canWrite: boolean;
  readonly post: BlogEditorPost;
}

export interface UseBlogPostEditorResult {
  readonly blocker: Blocker;
  readonly canSave: boolean;
  /** Close the stale-write dialog, keeping local edits unsaved. */
  readonly dismissStaleWrite: () => void;
  readonly fieldErrors: BlogPostFieldErrors;
  readonly isDirty: boolean;
  /** No form at all: the post is not a draft and the caller lacks blog:write. */
  readonly isReadOnly: boolean;
  readonly isSaved: boolean;
  readonly isSaving: boolean;
  readonly isStaleWriteOpen: boolean;
  /** Resend the same changes without the stale check. */
  readonly overwrite: () => void;
  /** Discard local edits and re-read the post from the server. */
  readonly reload: () => void;
  readonly save: () => void;
  /** A save failure that belongs to no field (a lost post, a server error). */
  readonly saveError: string | null;
  readonly setField: BlogPostFieldChangeHandler;
  readonly values: BlogPostEditorValues;
}

/**
 * @description Everything the `/blog/:postId` route needs to edit one post:
 * local edit state, explicit save (button and ⌘S; there is no autosave), the
 * typed save outcome mapped onto field errors, the stale-write dialog, the
 * read-only decision and the unsaved-changes guard.
 */
export const useBlogPostEditor = (
  options: UseBlogPostEditorOptions,
): UseBlogPostEditorResult => {
  const { canWrite, post } = options;

  // Hooks
  const { isDirty, reset, setField, values } = useBlogPostDraft(post);
  const { isSaving, overwrite, result, save, submitted } = useBlogPostSave({
    post,
    values,
  });
  const isReadOnly =
    result?.outcome === 'publishPermissionRequired' ||
    (!canWrite && post.state !== BlogPostState.Draft);
  const blocker = useUnsavedChangesGuard(isDirty && !isReadOnly);
  const revalidator = useRevalidator();
  const [dismissed, setDismissed] = React.useState<BlogPostSaveResult | null>(
    null,
  );

  // Setup
  const clientErrors = validateBlogPostEditorValues(values);
  const fieldErrors: BlogPostFieldErrors = {
    ...filterStaleFieldErrors(
      toBlogPostSaveFieldErrors(result),
      submitted,
      values,
    ),
    ...clientErrors,
  };
  const canSave =
    !isReadOnly &&
    !isSaving &&
    isDirty &&
    Object.keys(clientErrors).length === 0;
  const isStaleWriteOpen =
    result?.outcome === 'staleWrite' && result !== dismissed;
  const saveError =
    result?.outcome === 'error' || result?.outcome === 'notFound'
      ? result.message
      : null;

  // Handlers
  const saveIfAllowed = (): void => {
    if (canSave) {
      save();
    }
  };

  const dismissStaleWrite = (): void => setDismissed(result);

  const reload = (): void => {
    setDismissed(result);
    reset();
    void revalidator.revalidate();
  };

  const handleKeyDown = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveIfAllowed();
    }
  };

  // Markup

  // Life Cycle
  // Re-bound every render so the listener always sees the latest values.
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // 🔌 Short Circuit

  return {
    blocker,
    canSave,
    dismissStaleWrite,
    fieldErrors,
    isDirty,
    isReadOnly,
    isSaved: result?.outcome === 'saved' && !isDirty,
    isSaving,
    isStaleWriteOpen,
    overwrite,
    reload,
    save: saveIfAllowed,
    saveError,
    setField,
    values,
  };
};
